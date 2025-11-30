// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Element } from '../element/element';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Section } from '../section/section';

/**
 * An abstract error class that occurs when a {@link Element Element} has an invalid value.
 */
export abstract class ConfigValueException extends Error {
  constructor(elementName: string, message?: string) {
    super();
    this.name = this.constructor.name;
    this.message = this.getBaseMessage(elementName);
    if (message) {
      this.message = `${this.message}: ${message}`;
    }
  }

  protected abstract getBaseMessage(elementName: string): string;
}

/**
 * An error that occurs when a {@link Element Element} is unset.
 */
export class ConfigUnsetException extends ConfigValueException {
  protected getBaseMessage(elementName: string): string {
    return `Value unset for ${elementName}`;
  }
}

/**
 * An error that occurs when a {@link Element Element} is invalid.
 */
export class ConfigInvalidException extends ConfigValueException {
  protected getBaseMessage(elementName: string): string {
    return `Invalid value for ${elementName}`;
  }
}

/**
 * An abstract error class that occurs when an item already exists.
 */
export abstract class ItemExistsException extends Error {
  constructor(itemType: string, itemName: string, additionalMessage?: string) {
    super();
    this.name = ItemExistsException.name;
    this.message = `${itemType} with name ${itemName} already exists.`;
    if (additionalMessage) {
      this.message = `${this.message} ${additionalMessage}`;
    }
  }
}

/**
 * An error that occurs when a {@link Section Section} already exists.
 */
export class SectionExistsException extends ItemExistsException {
  constructor(sectionName: string, additionalMessage?: string) {
    super('Section', sectionName, additionalMessage);
    this.name = SectionExistsException.name;
  }
}

/**
 * An error that occurs when a {@link Element Element} already exists.
 */
export class ElementExistsException extends ItemExistsException {
  constructor(elementName: string, additionalMessage?: string) {
    super('Element', elementName, additionalMessage);
    this.name = ElementExistsException.name;
  }
}

/**
 * An error that occurs when the name of a configuration component is invalid.
 */
export class InvalidNameException extends Error {
  constructor(message: string) {
    super();
    this.name = InvalidNameException.name;
    this.message = message;
  }
}

/**
 * An error that occurs when a {@link Section Section} is not found.
 */
export class SectionNotFoundException extends Error {
  constructor(sectionName: string) {
    super();
    this.name = SectionNotFoundException.name;
    this.message = `Section with name ${sectionName} not found.`;
  }
}

/**
 * An error that occurs when a {@link Element Element} is not found.
 */
export class ElementNotFoundException extends Error {
  constructor(elementName: string) {
    super();
    this.name = ElementNotFoundException.name;
    this.message = `Element with name ${elementName} not found.`;
  }
}
