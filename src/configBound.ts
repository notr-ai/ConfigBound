import { BindContext } from './bind/bindContext';
import { Bind } from './bind/bind';
import { Section } from './section/section';
import {
  ConfigInvalidException,
  ElementNotFoundException,
  SectionExistsException,
  SectionNotFoundException
} from './utilities/errors';
import { ConsoleLogger, Logger } from './utilities/logger';
import { sanitizeName } from './utilities/sanitizeNames';

/**
 * A ConfigBound is the top level object that contains all the {@link Section}s and {@link Bind}s.
 * It is used to retrieve the values of the {@link Element Elements} from its binds.
 * @see {@link docs 'docs/project/configBound.md'} for more information.
 */
export class ConfigBound implements BindContext {
  readonly name: string;
  private logger: Logger;
  readonly binds: Bind[];
  private sections: Section[];

  constructor(
    name: string,
    binds: Bind[] = [],
    sections: Section[] = [],
    logger?: Logger
  ) {
    this.logger = logger ?? new ConsoleLogger();
    this.name = sanitizeName(name);
    this.binds = binds;
    this.sections = [];

    // Add sections after initialization so we can pass this as the bindContext
    if (sections.length > 0) {
      sections.forEach((section) => this.addSection(section));
    }
  }

  /**
   * Adds a Bind to the ConfigBound
   * @param bind - The Bind to add
   */
  public addBind(bind: Bind) {
    this.logger.debug(`Adding config bind: ${bind.name}`);
    this.binds.push(bind);
  }

  /**
   * Adds a Section to the ConfigBound
   * @param section - The Section to add
   */
  public addSection(section: Section) {
    this.logger.debug(`Adding config section: ${section.name}`);
    const sanitizedName = sanitizeName(section.name);
    if (this.sections.some((x) => x.name === sanitizedName)) {
      throw new SectionExistsException(sanitizedName);
    }
    // Pass the logger to the section
    section.setLogger(this.logger);

    // Pass this ConfigBound as the BindContext to the section
    section.setBindContext(this);

    this.sections.push(section);
  }

  /**
   * Gets the Sections of the ConfigBound
   * @returns The Sections
   */
  public getSections() {
    return this.sections;
  }

  /**
   * Gets the value of a Element using the first available Bind
   * @param sectionName - The name of the section
   * @param elementName - The name of the element
   * @returns The value of the element
   */
  public get<T>(sectionName: string, elementName: string): T | undefined {
    this.logger.debug(`Getting value for ${sectionName}.${elementName}`);

    // Check if section exists
    const section = this.sections.find((x) => x.name === sectionName);
    if (!section) {
      throw new SectionNotFoundException(sectionName);
    }
    // Check if element exists
    const element = section.getElements().find((x) => x.name === elementName);
    if (!element) {
      throw new ElementNotFoundException(elementName);
    }
    // Try to get value from each Bind until one returns a value
    for (const bind of this.binds) {
      const value = bind.get<T>(sectionName, elementName);
      if (value !== undefined) {
        this.logger.trace?.(
          `Found value for ${sectionName}.${elementName} in ${bind.name}: ${element.sensitive ? '[MASKED]' : value}`
        );

        // Validate the value against the element's schema
        const validationResult = element.validator.validate(value);
        if (validationResult.error) {
          this.logger.error(
            `Value for ${sectionName}.${elementName} failed validation: ${validationResult.error.message}`
          );
          throw new ConfigInvalidException(
            `${sectionName}.${elementName}`,
            validationResult.error.message
          );
        }

        // Return the validated (and potentially transformed) value
        return validationResult.value as T;
      } else {
        this.logger.trace?.(
          `No value found for ${sectionName}.${elementName} in ${bind.name}`
        );
      }
    }

    // If no value found in binds but element has a default, use that
    if (element.default !== undefined) {
      this.logger.debug(
        `Using default value for ${sectionName}.${elementName}: ${element.sensitive ? '[MASKED]' : element.default}`
      );
      return element.default as unknown as T;
    }

    // If no bind returned a value, return undefined
    this.logger.debug(`No value found for ${sectionName}.${elementName}`);
    return undefined;
  }

  /**
   * Gets the value of a Element
   * @param sectionName - The name of the section
   * @param elementName - The name of the element
   * @returns The value of the element or throws if not found
   */
  public getOrThrow<T>(sectionName: string, elementName: string): T {
    const value = this.get<T>(sectionName, elementName);
    if (value === undefined) {
      throw new ElementNotFoundException(elementName);
    }
    return value;
  }
}
