#!/usr/bin/env node

import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli.module.js';

async function bootstrap() {
  await CommandFactory.run(CliModule, {
    logger: false,
    errorHandler: (err) => {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'commander.help') {
        process.exit(0);
      }
      console.error('Unexpected error:', err);
      process.exit(1);
    }
  });
}

bootstrap();
