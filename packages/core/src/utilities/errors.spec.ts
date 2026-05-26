import { describe, test, expect } from '@jest/globals';
import {
  ConfigUnsetException,
  SectionExistsException,
  ElementExistsException,
  InvalidNameException
} from './errors';

/**
 * @group unit
 */
describe('Error Classes', () => {
  describe('ConfigUnsetException', () => {
    test('should set name and message correctly', () => {
      const error = new ConfigUnsetException('test-element');
      expect(error.name).toBe('ConfigUnsetException');
      expect(error.message).toBe('Value unset for test-element');
    });
  });

  describe('SectionExistsException', () => {
    test('should set name and message correctly without additional message', () => {
      const error = new SectionExistsException('testSection');
      expect(error.name).toBe('SectionExistsException');
      expect(error.message).toBe(
        'Section with name testSection already exists.'
      );
    });

    test('should set name and message correctly with additional message', () => {
      const error = new SectionExistsException(
        'testSection',
        'Please use another name.'
      );
      expect(error.name).toBe('SectionExistsException');
      expect(error.message).toBe(
        'Section with name testSection already exists. Please use another name.'
      );
    });
  });

  describe('ElementExistsException', () => {
    test('should set name and message correctly without additional message', () => {
      const error = new ElementExistsException('testElement');
      expect(error.name).toBe('ElementExistsException');
      expect(error.message).toBe(
        'Element with name testElement already exists.'
      );
    });

    test('should set name and message correctly with additional message', () => {
      const error = new ElementExistsException(
        'testElement',
        'Please use another name.'
      );
      expect(error.name).toBe('ElementExistsException');
      expect(error.message).toBe(
        'Element with name testElement already exists. Please use another name.'
      );
    });
  });

  describe('InvalidNameException', () => {
    test('should set name and message correctly', () => {
      const error = new InvalidNameException('Invalid name format');
      expect(error.name).toBe('InvalidNameException');
      expect(error.message).toBe('Invalid name format');
    });
  });
});
