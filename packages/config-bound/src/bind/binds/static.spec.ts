import { StaticBind } from './static';
import { EnvVarBind } from './envVar';
import { ConfigBound, configItem } from '../../configBound';
import Joi from 'joi';

describe('StaticBind', () => {
  it('retrieves flat dot-path values', async () => {
    const bind = new StaticBind({
      'app.port': 3000
    });

    await expect(bind.retrieve('app.port')).resolves.toBe(3000);
  });

  it('retrieves nested values', async () => {
    const bind = new StaticBind({
      app: {
        host: 'localhost'
      }
    });

    await expect(bind.retrieve('app.host')).resolves.toBe('localhost');
  });

  it('prefers nested values over flat values when both exist', async () => {
    const bind = new StaticBind({
      app: {
        mode: 'nested'
      },
      'app.mode': 'flat'
    });

    await expect(bind.retrieve('app.mode')).resolves.toBe('nested');
  });

  it('returns undefined when no value exists for the path', async () => {
    const bind = new StaticBind({
      app: {
        host: 'localhost'
      }
    });

    await expect(bind.retrieve('app.port')).resolves.toBeUndefined();
  });

  it('treats flat null values as undefined', async () => {
    const bind = new StaticBind({
      'app.port': null
    });

    await expect(bind.retrieve('app.port')).resolves.toBeUndefined();
  });

  it('treats nested null values as undefined', async () => {
    const bind = new StaticBind({
      app: {
        port: null
      }
    });

    await expect(bind.retrieve('app.port')).resolves.toBeUndefined();
  });

  it('falls back to flat value when nested value is null', async () => {
    const bind = new StaticBind({
      app: {
        mode: null
      },
      'app.mode': 'flat'
    });

    await expect(bind.retrieve('app.mode')).resolves.toBe('flat');
  });
});

describe('StaticBind integration with ConfigBound', () => {
  it('can override lower-priority binds when placed earlier', async () => {
    process.env.STATIC_BIND_TEST_APP_PORT = '9999';

    try {
      const staticBind = new StaticBind({
        'app.port': 8080
      });
      const envBind = new EnvVarBind({ prefix: 'STATIC_BIND_TEST' });

      const config = await ConfigBound.createConfig(
        {
          port: configItem<number>({
            validator: Joi.number().port()
          })
        },
        { binds: [staticBind, envBind] }
      );

      await expect(config.get('app', 'port')).resolves.toBe(8080);
    } finally {
      delete process.env.STATIC_BIND_TEST_APP_PORT;
    }
  });

  it('acts as fallback when placed after other binds', async () => {
    delete process.env.STATIC_BIND_TEST_APP_PORT;

    const staticBind = new StaticBind({
      'app.port': 7000
    });
    const envBind = new EnvVarBind({ prefix: 'STATIC_BIND_TEST' });

    const config = await ConfigBound.createConfig(
      {
        port: configItem<number>({
          validator: Joi.number().port()
        })
      },
      { binds: [envBind, staticBind] }
    );

    await expect(config.get('app', 'port')).resolves.toBe(7000);
  });

  it('allows lower-priority binds to provide values when static value is null', async () => {
    process.env.STATIC_BIND_TEST_APP_PORT = '9090';

    try {
      const staticBind = new StaticBind({
        'app.port': null
      });
      const envBind = new EnvVarBind({ prefix: 'STATIC_BIND_TEST' });

      const config = await ConfigBound.createConfig(
        {
          port: configItem<number>({
            validator: Joi.number().port()
          })
        },
        { binds: [staticBind, envBind] }
      );

      await expect(config.get('app', 'port')).resolves.toBe(9090);
    } finally {
      delete process.env.STATIC_BIND_TEST_APP_PORT;
    }
  });
});
