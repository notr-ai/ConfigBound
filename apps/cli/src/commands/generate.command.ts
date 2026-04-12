import { Command, CommandRunner } from 'nest-commander';
import { GenerateBindCommand } from './generate-bind.command.js';

@Command({
  name: 'generate',
  description: 'Generate new ConfigBound components',
  subCommands: [GenerateBindCommand]
})
export class GenerateCommand extends CommandRunner {
  async run(): Promise<void> {
    this.command.help();
  }
}
