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
});
