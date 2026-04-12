import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FileBind } from './file';
import { ConfigInvalidException } from '../../utilities/errors';
import { ConfigBound, configItem, configSection } from '../../configBound';
import { EnvVarBind } from './envVar';
import { Element } from '../../element/element';
import { Section } from '../../section/section';
import Joi from 'joi';

// -- Helpers --------------------------------------------------------------

let tmpDir: string;

function tmpFile(name: string, content: string): string {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'configbound-file-bind-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// -- Format detection -----------------------------------------------------

describe('FileBind format detection', () => {
  // One file is enough to prove detection works — the parsing
  // correctness of each format is the library's concern, not ours.
  const minimalJson = '{ "a": 1 }';

  it.each([
    ['.json', 'json'],
    ['.jsonc', 'jsonc'],
    ['.yml', 'yaml'],
    ['.yaml', 'yaml']
  ])('detects %s as %s', (ext, expectedFormat) => {
    const filePath = tmpFile(`config${ext}`, minimalJson);
    const bind = new FileBind({ filePath });
    expect(bind.format).toBe(expectedFormat);
  });

  it('throws for an unknown extension', () => {
    const filePath = tmpFile('config.toml', '');
    expect(() => new FileBind({ filePath })).toThrow(ConfigInvalidException);
    expect(() => new FileBind({ filePath })).toThrow(/Unsupported file extension/);
  });

  it('uses explicit format override regardless of extension', async () => {
    const filePath = tmpFile('settings.conf', '{ "x": 1 }');
    const bind = new FileBind({ filePath, format: 'json' });
    expect(bind.format).toBe('json');
    await expect(bind.retrieve('x')).resolves.toBe(1);
  });
});

// -- File reading & parsing -----------------------------------------------

describe('FileBind file reading', () => {
  it('throws when the file does not exist', () => {
    const filePath = path.join(tmpDir, 'nope.json');
    expect(() => new FileBind({ filePath })).toThrow(ConfigInvalidException);
    expect(() => new FileBind({ filePath })).toThrow(/Cannot read/);
  });

  it('throws when JSON content is malformed', () => {
    const filePath = tmpFile('bad.json', '{ broken }');
    expect(() => new FileBind({ filePath })).toThrow(ConfigInvalidException);
    expect(() => new FileBind({ filePath })).toThrow(/Failed to parse/);
  });

  it('throws when YAML content is malformed', () => {
    const filePath = tmpFile('bad.yaml', ':\n  :\n    - [invalid');
    expect(() => new FileBind({ filePath })).toThrow(ConfigInvalidException);
  });

  it('throws when JSONC content is malformed', () => {
    const filePath = tmpFile('bad.jsonc', '{ // ok comment\n broken }');
    expect(() => new FileBind({ filePath })).toThrow(ConfigInvalidException);
    expect(() => new FileBind({ filePath })).toThrow(/Failed to parse/);
  });

  it('throws when the top-level value is an array', () => {
    const filePath = tmpFile('arr.json', '[1, 2, 3]');
    expect(() => new FileBind({ filePath })).toThrow(ConfigInvalidException);
    expect(() => new FileBind({ filePath })).toThrow(
      /must contain an object at the top level, found array/
    );
  });

  it('throws when the top-level value is a scalar', () => {
    const filePath = tmpFile('scalar.yaml', '"just a string"');
    expect(() => new FileBind({ filePath })).toThrow(ConfigInvalidException);
    expect(() => new FileBind({ filePath })).toThrow(
      /must contain an object at the top level/
    );
  });

  it('treats an empty JSON object as valid empty config', async () => {
    const filePath = tmpFile('empty.json', '{}');
    const bind = new FileBind({ filePath });
    await expect(bind.retrieve('anything')).resolves.toBeUndefined();
  });

  it('treats an empty YAML file as valid empty config', async () => {
    const filePath = tmpFile('empty.yaml', '');
    const bind = new FileBind({ filePath });
    await expect(bind.retrieve('anything')).resolves.toBeUndefined();
  });

  it('parses JSONC with comments and trailing commas', async () => {
    const content = `{
      // server config
      "server": {
        "host": "localhost",
        "port": 8080, /* trailing comma */
      },
    }`;
    const filePath = tmpFile('config.jsonc', content);
    const bind = new FileBind({ filePath });
    await expect(bind.retrieve('server.host')).resolves.toBe('localhost');
  });
});

// -- Key resolution -------------------------------------------------------

describe('FileBind retrieve', () => {
  let bind: FileBind;

  beforeEach(() => {
    const filePath = tmpFile(
      'config.json',
      JSON.stringify({
        database: { host: 'db.local', port: 5432 },
        'flat.key': 'flat-value',
        nested: { deep: { value: 42 } },
        overlap: { key: 'from-nested' },
        'overlap.key': 'from-flat'
      })
    );
    bind = new FileBind({ filePath });
  });

  it('resolves nested paths', async () => {
    await expect(bind.retrieve('database.host')).resolves.toBe('db.local');
    await expect(bind.retrieve('database.port')).resolves.toBe(5432);
  });

  it('falls back to flat key when nested path does not exist', async () => {
    await expect(bind.retrieve('flat.key')).resolves.toBe('flat-value');
  });

  it('prefers nested over flat when both exist', async () => {
    await expect(bind.retrieve('overlap.key')).resolves.toBe('from-nested');
  });

  it('traverses beyond two segments', async () => {
    await expect(bind.retrieve('nested.deep.value')).resolves.toBe(42);
  });

  it('returns undefined for a non-existent path', async () => {
    await expect(bind.retrieve('no.such.key')).resolves.toBeUndefined();
  });

  it('returns undefined for explicit null values', async () => {
    const filePath = tmpFile(
      'nulls.json',
      JSON.stringify({ section: { key: null } })
    );
    const nullBind = new FileBind({ filePath });
    await expect(nullBind.retrieve('section.key')).resolves.toBeUndefined();
  });

  it('falls back to flat key when nested key is explicitly null', async () => {
    // null at the nested path triggers the ?? fallback to the flat key,
    // so the flat key wins rather than surfacing undefined.
    const filePath = tmpFile(
      'null-flat.json',
      JSON.stringify({ section: { key: null }, 'section.key': 'flat-value' })
    );
    const nullFlatBind = new FileBind({ filePath });
    await expect(nullFlatBind.retrieve('section.key')).resolves.toBe('flat-value');
  });

  it('preserves falsy non-null values', async () => {
    const filePath = tmpFile(
      'falsy.json',
      JSON.stringify({
        section: { zero: 0, empty: '', no: false }
      })
    );
    const falsyBind = new FileBind({ filePath });
    await expect(falsyBind.retrieve('section.zero')).resolves.toBe(0);
    await expect(falsyBind.retrieve('section.empty')).resolves.toBe('');
    await expect(falsyBind.retrieve('section.no')).resolves.toBe(false);
  });

  it('does not coerce YAML-specific values (JSON_SCHEMA is enforced)', async () => {
    // Without JSON_SCHEMA, js-yaml would convert "yes" → true and date strings → Date.
    // This test ensures our schema choice prevents that surprise.
    const yamlContent = [
      'section:',
      '  toggle: yes',
      '  date: 2024-01-15'
    ].join('\n');
    const filePath = tmpFile('coerce.yaml', yamlContent);
    const bind = new FileBind({ filePath });
    await expect(bind.retrieve('section.toggle')).resolves.toBe('yes');
    await expect(bind.retrieve('section.date')).resolves.toBe('2024-01-15');
  });

  it('returns arrays and objects as-is', async () => {
    const filePath = tmpFile(
      'complex.json',
      JSON.stringify({
        section: {
          hosts: ['a', 'b'],
          meta: { nested: true }
        }
      })
    );
    const complexBind = new FileBind({ filePath });
    await expect(complexBind.retrieve('section.hosts')).resolves.toEqual(['a', 'b']);
    await expect(complexBind.retrieve('section.meta')).resolves.toEqual({ nested: true });
  });
});

// -- rootKey scoping ------------------------------------------------------

describe('FileBind rootKey', () => {
  it('scopes into a subtree', async () => {
    const filePath = tmpFile(
      'rooted.json',
      JSON.stringify({
        wrapper: { database: { host: 'scoped.local' } }
      })
    );
    const bind = new FileBind({ filePath, rootKey: 'wrapper' });
    await expect(bind.retrieve('database.host')).resolves.toBe('scoped.local');
  });

  it('supports multi-segment rootKey', async () => {
    const filePath = tmpFile(
      'deep-root.json',
      JSON.stringify({
        a: { b: { server: { port: 9090 } } }
      })
    );
    const bind = new FileBind({ filePath, rootKey: 'a.b' });
    await expect(bind.retrieve('server.port')).resolves.toBe(9090);
  });

  it('throws when rootKey path does not exist', () => {
    const filePath = tmpFile('config.json', JSON.stringify({ other: {} }));
    expect(() => new FileBind({ filePath, rootKey: 'missing' })).toThrow(
      ConfigInvalidException
    );
    expect(() => new FileBind({ filePath, rootKey: 'missing' })).toThrow(
      /Root key "missing" does not resolve/
    );
  });

  it('throws when rootKey resolves to a non-object', () => {
    const filePath = tmpFile(
      'config.json',
      JSON.stringify({ level: 'not-an-object' })
    );
    expect(() => new FileBind({ filePath, rootKey: 'level' })).toThrow(
      ConfigInvalidException
    );
  });
});

// -- reload ---------------------------------------------------------------

describe('FileBind reload', () => {
  it('picks up file changes', async () => {
    const filePath = tmpFile(
      'live.json',
      JSON.stringify({ section: { val: 'original' } })
    );
    const bind = new FileBind({ filePath });
    await expect(bind.retrieve('section.val')).resolves.toBe('original');

    fs.writeFileSync(
      filePath,
      JSON.stringify({ section: { val: 'updated' } }),
      'utf-8'
    );
    bind.reload();
    await expect(bind.retrieve('section.val')).resolves.toBe('updated');
  });

  it('throws when the file has been deleted', () => {
    const filePath = tmpFile('ephemeral.json', '{}');
    const bind = new FileBind({ filePath });

    fs.unlinkSync(filePath);
    expect(() => bind.reload()).toThrow(ConfigInvalidException);
    expect(() => bind.reload()).toThrow(/Cannot read/);
  });

  it('throws when rootKey subtree disappears after reload', async () => {
    const filePath = tmpFile(
      'rooted-live.json',
      JSON.stringify({ wrapper: { val: 'original' } })
    );
    const bind = new FileBind({ filePath, rootKey: 'wrapper' });
    await expect(bind.retrieve('val')).resolves.toBe('original');

    fs.writeFileSync(filePath, JSON.stringify({ other: {} }), 'utf-8');
    expect(() => bind.reload()).toThrow(ConfigInvalidException);
    expect(() => bind.reload()).toThrow(/Root key "wrapper" does not resolve/);
  });
});

// -- ConfigBound integration ----------------------------------------------

describe('FileBind integration with ConfigBound', () => {
  it('provides values to ConfigBound that pass Joi validation', async () => {
    const filePath = tmpFile(
      'app.json',
      JSON.stringify({ app: { port: 3000, host: 'localhost' } })
    );
    const fileBind = new FileBind({ filePath });

    const portElement = new Element<number>(
      'port',
      'Server port',
      undefined,
      undefined,
      false,
      false,
      Joi.number().port()
    );
    const hostElement = new Element<string>(
      'host',
      'Server host',
      undefined,
      undefined,
      false,
      false,
      Joi.string()
    );
    const section = new Section('app', [portElement, hostElement]);
    const config = new ConfigBound('myapp', [fileBind], [section]);

    await expect(config.get('app', 'port')).resolves.toBe(3000);
    await expect(config.get('app', 'host')).resolves.toBe('localhost');
  });

  it('respects bind priority — earlier binds win', async () => {
    const filePath = tmpFile(
      'low-priority.json',
      JSON.stringify({ app: { port: 3000 } })
    );
    const envBind = new EnvVarBind({ prefix: 'FILEBIND_TEST' });
    const fileBind = new FileBind({ filePath });

    const portElement = new Element<number>(
      'port',
      'Server port',
      undefined,
      undefined,
      false,
      false,
      Joi.number()
    );
    const section = new Section('app', [portElement]);

    // EnvVarBind first → env wins when set
    process.env.FILEBIND_TEST_APP_PORT = '9999';
    try {
      const config = new ConfigBound('myapp', [envBind, fileBind], [section]);
      await expect(config.get('app', 'port')).resolves.toBe(9999);
    } finally {
      delete process.env.FILEBIND_TEST_APP_PORT;
    }
  });

  it('falls back to element default when key is missing from file', async () => {
    const filePath = tmpFile('sparse.json', JSON.stringify({ app: {} }));
    const fileBind = new FileBind({ filePath });

    const portElement = new Element<number>(
      'port',
      'Server port',
      8080,
      undefined,
      false,
      false,
      Joi.number()
    );
    const section = new Section('app', [portElement]);
    const config = new ConfigBound('myapp', [fileBind], [section]);

    await expect(config.get('app', 'port')).resolves.toBe(8080);
  });

  it('works with the declarative createConfig API', async () => {
    const filePath = tmpFile(
      'declarative.json',
      JSON.stringify({
        app: { port: 4000 },
        database: { host: 'db.example.com' }
      })
    );
    const fileBind = new FileBind({ filePath });

    const config = await ConfigBound.createConfig(
      {
        port: configItem<number>({
          default: 3000,
          validator: Joi.number()
        }),
        database: configSection<{ host: string }>(
          {
            host: configItem<string>({
              default: 'localhost',
              validator: Joi.string()
            })
          },
          'Database settings'
        )
      },
      { binds: [fileBind] }
    );

    await expect(config.get('app', 'port')).resolves.toBe(4000);
    await expect(config.get('database', 'host')).resolves.toBe('db.example.com');
  });
});
