import { Element } from '../element/element';
import { ElementExistsException } from '../utilities/errors';
import { Logger } from '../utilities/logger';
import { sanitizeName } from '../utilities/sanitizeNames';
import { ConfigValueProvider } from '../bind/configValueProvider';

/**
 * A grouping of {@link Element Elements}
 */
export class Section {
  /**
   * The name of the Section
   */
  name: string;
  /**
   * An optional description of the Section
   */
  description?: string;
  /**
   * The {@link Element Elements} of the Section
   */
  private elements: Element<unknown>[];
  /**
   * Logger instance
   */
  private logger?: Logger;
  /**
   * Reference to the parent ConfigValueProvider
   */
  private valueProvider?: ConfigValueProvider;

  constructor(
    name: string,
    elements: Element<unknown>[],
    description?: string,
    logger?: Logger,
    valueProvider?: ConfigValueProvider
  ) {
    this.name = sanitizeName(name);
    this.description = description;
    this.logger = logger;
    this.valueProvider = valueProvider;
    this.elements = [];
    if (elements.length > 0) {
      this.setElements(elements);
    }
  }

  /**
   * Finds duplicate {@link Element Elements} in a given array.
   * @param elements - The array of Elements to search
   * @returns An array of Elements that have duplicate names
   */
  public static findDuplicateElements(
    elements: Element<unknown>[]
  ): Element<unknown>[] {
    // Count occurrences of each name
    const nameCounts = elements.reduce(
      (acc, element) => {
        acc[element.name] = (acc[element.name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get names that appear more than once
    const duplicateNames = Object.keys(nameCounts).filter(
      (name) => nameCounts[name] > 1
    );

    // Return all elements whose names appear in the duplicateNames list
    return elements.filter((element) => duplicateNames.includes(element.name));
  }

  /**
   * Sets the {@link Element Elements} of the Section
   * @param elements - The array of Elements to set
   */
  public setElements(elements: Element<unknown>[]) {
    const duplicateElements = Section.findDuplicateElements(elements);
    if (duplicateElements.length > 0) {
      throw new ElementExistsException(duplicateElements[0].name);
    }
    this.elements = [];
    elements.forEach((element) => {
      this.addElement(element);
    });
  }

  /**
   * Sets the logger instance
   * @param logger - The logger to use
   */
  public setLogger(logger: Logger): void {
    this.logger = logger;
    // Pass logger to all existing elements
    this.elements.forEach((element) => {
      element.setLogger(logger);
    });
  }

  /**
   * Sets the value provider
   * @param valueProvider - The ConfigValueProvider to use
   */
  public setConfigValueProvider(valueProvider: ConfigValueProvider): void {
    this.valueProvider = valueProvider;
    // Elements will use this provider through the getValue method
  }

  /**
   * Gets the current value provider
   * @returns The current ConfigValueProvider or undefined if not set
   */
  public getConfigValueProvider(): ConfigValueProvider | undefined {
    return this.valueProvider;
  }

  /**
   * Adds a {@link Element Element} to the Section
   * @param element - The Element to add
   */
  public addElement(element: Element<unknown>) {
    // Create a new array with all current elements plus the new one
    const newElements = this.elements.concat([element]);

    // Check for duplicates
    const duplicateElements = Section.findDuplicateElements(newElements);
    if (duplicateElements.length > 0) {
      throw new ElementExistsException(duplicateElements[0].name);
    }

    // Wire up the element with proper dependencies
    element.setParentSection(this.name);

    // Pass the logger to the element if we have one
    if (this.logger) {
      element.setLogger(this.logger);
    }

    // If no duplicates, update the elements array
    this.elements = newElements;
  }

  /**
   * Gets the {@link Element Elements} of the Section
   * @returns The array of Elements
   */
  public getElements() {
    return this.elements;
  }

  /**
   * Gets a specific element by name
   * @param elementName - The name of the element to get
   * @returns The element or undefined if not found
   */
  public getElement(elementName: string): Element<unknown> | undefined {
    return this.elements.find((element) => element.name === elementName);
  }

  /**
   * Gets the value of a specific element using the current value provider
   * @param elementName - The name of the element to get the value for
   * @returns The value or undefined if not found or no value provider set
   */
  public getValue<T>(elementName: string): T | undefined {
    if (!this.valueProvider) {
      this.logger?.warn(
        `Cannot get value for ${this.name}.${elementName}: No value provider set`
      );
      return undefined;
    }
    const element = this.getElement(elementName);
    if (!element) {
      this.logger?.warn(`Element not found: ${elementName}`);
      return undefined;
    }
    // Delegate to the element's get method, which will handle validation and fallbacks
    return element.get<T>(this.valueProvider);
  }
}
