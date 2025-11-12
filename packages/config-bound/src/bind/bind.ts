// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Element } from '../element/element';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Section } from '../section/section';

/**
 * A Bind retrieves the values of the {@link Element} from their source.
 */
export abstract class Bind {
  readonly name: BindName;

  constructor(name: BindName) {
    this.name = name;
  }

  /**
   * Retrieves the value of the Bind.
   * @param elementName - The name of the {@link Element}
   * @returns The value of the element
   */
  abstract retrieve<T>(elementName: string): T | undefined;

  /**
   * Gets the value from the bind for a specific element
   * @param sectionName - The name of the {@link Section}
   * @param elementName - The name of the {@link Element}
   * @returns The value of the element
   */
  get<T>(sectionName: string, elementName: string): T | undefined {
    return this.retrieve<T>(`${sectionName}.${elementName}`);
  }
}

/**
 * Kinds of Binds.
 */
export type BindName = 'EnvironmentVariable';
