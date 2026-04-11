import { StaticBind } from './static';
import { EnvVarBind } from './envVar';
import { ConfigBound, configItem } from '../../configBound';
import Joi from 'joi';

describe('StaticBind', () => {
  it('retrieves flat dot-path values', () => {
    const bind = new StaticBind({
      'app.port': 3000
    });

    expect(bind.retrieve('app.port')).toBe(3000);
  });

  it('retrieves nested values', () => {
    const bind = new StaticBind({
      app: {
        host: 'localhost'
      }
    });

    expect(bind.retrieve('app.host')).toBe('localhost');
  });

  it('prefers nested values over flat values when both exist', () => {
    const bind = new StaticBind({
      app: {
        mode: 'nested'
      },
      'app.mode': 'flat'
    });

    expect(bind.retrieve('app.mode')).toBe('nested');
  });

  it('returns undefined when no value exists for the path', () => {
    const bind = new StaticBind({
      app: {
        host: 'localhost'
      }
    });

    expect(bind.retrieve('app.port')).toBeUndefined();
  });

  it('treats flat null values as undefined', () => {
    const bind = new StaticBind({
      'app.port': null
    });

    expect(bind.retrieve('app.port')).toBeUndefined();
  });

  it('treats nested null values as undefined', () => {
    const bind = new StaticBind({
      app: {
        port: null
      }
    });

    expect(bind.retrieve('app.port')).toBeUndefined();
  });

  it('falls back to flat value when nested value is null', () => {
    const bind = new StaticBind({
      app: {
        mode: null
      },
      'app.mode': 'flat'
    });

    expect(bind.retrieve('app.mode')).toBe('flat');
  });
});

describe('StaticBind integration with ConfigBound', () => {
  it('can override lower-priority binds when placed earlier', () => {
    process.env.STATIC_BIND_TEST_APP_PORT = '9999';

    try {
      const staticBind = new StaticBind({
        'app.port': 8080
      });
      const envBind = new EnvVarBind({ prefix: 'STATIC_BIND_TEST' });

      const config = ConfigBound.createConfig(
        {
          port: configItem<number>({
            validator: Joi.number().port()
          })
        },
        { binds: [staticBind, envBind] }
      );

      expect(config.get('app', 'port')).toBe(8080);
    } finally {
      delete process.env.STATIC_BIND_TEST_APP_PORT;
    }
  });

  it('acts as fallback when placed after other binds', () => {
    delete process.env.STATIC_BIND_TEST_APP_PORT;

    const staticBind = new StaticBind({
      'app.port': 7000
    });
    const envBind = new EnvVarBind({ prefix: 'STATIC_BIND_TEST' });

    const config = ConfigBound.createConfig(
      {
        port: configItem<number>({
          validator: Joi.number().port()
        })
      },
      { binds: [envBind, staticBind] }
    );

    expect(config.get('app', 'port')).toBe(7000);
  });

  it('allows lower-priority binds to provide values when static value is null', () => {
    process.env.STATIC_BIND_TEST_APP_PORT = '9090';

    try {
      const staticBind = new StaticBind({
        'app.port': null
      });
      const envBind = new EnvVarBind({ prefix: 'STATIC_BIND_TEST' });

      const config = ConfigBound.createConfig(
        {
          port: configItem<number>({
            validator: Joi.number().port()
          })
        },
        { binds: [staticBind, envBind] }
      );

      expect(config.get('app', 'port')).toBe(9090);
    } finally {
      delete process.env.STATIC_BIND_TEST_APP_PORT;
    }
  });
});
