/**
 * Interface for objects that can provide configuration values.
 * Implemented by ConfigBound and allows elements to retrieve their values.
 */
export interface ConfigValueProvider {
  get<T>(sectionName: string, elementName: string): T | undefined;
}
