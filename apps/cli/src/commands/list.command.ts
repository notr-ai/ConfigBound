import { Command, CommandRunner, Option } from 'nest-commander';
import { ConfigDiscoveryService } from '../services/config-discovery.service.js';
import chalk from 'chalk';
import * as path from 'path';

interface ListCommandOptions {
  recursive?: boolean;
}

@Command({
  name: 'list',
  description: 'List all discovered ConfigBound configurations',
  arguments: '[path]',
  argsDescription: {
    path: 'Directory to search (default: current directory)'
  }
})
export class ListCommand extends CommandRunner {
  constructor(private readonly discoveryService: ConfigDiscoveryService) {
    super();
  }

  async run(
    passedParams: string[],
    options?: ListCommandOptions
  ): Promise<void> {
    const searchPath = passedParams[0] || process.cwd();
    const recursive = options?.recursive !== false;

    try {
      console.log(
        chalk.blue(`Searching for ConfigBound configurations in: ${searchPath}`)
      );
      console.log(chalk.gray(`Recursive: ${recursive ? 'yes' : 'no'}`));
      console.log();

      const configs = await this.discoveryService.discoverConfigs(
        searchPath,
        recursive
      );

      if (configs.length === 0) {
        console.log(chalk.yellow('No ConfigBound configurations found.'));
        return;
      }

      console.log(
        chalk.green(
          `Found ${configs.length} ConfigBound configuration${configs.length === 1 ? '' : 's'}:`
        )
      );
      console.log();

      // Group by file
      const groupedByFile = configs.reduce(
        (acc: Record<string, typeof configs>, config: (typeof configs)[0]) => {
          if (!acc[config.filePath]) {
            acc[config.filePath] = [];
          }
          acc[config.filePath].push(config);
          return acc;
        },
        {} as Record<string, typeof configs>
      );

      for (const [filePath, fileConfigs] of Object.entries(groupedByFile)) {
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(chalk.cyan(`📄 ${relativePath}`));

        for (const config of fileConfigs as typeof configs) {
          const exportType = config.isDefault
            ? chalk.gray('(default)')
            : chalk.gray('(named)');
          const configNamePart = config.configName
            ? chalk.magenta(` - ${config.configName}`)
            : '';
          const linePart = chalk.gray(`:${config.lineNumber}`);

          console.log(
            `   ${chalk.white(config.exportName)} ${exportType}${configNamePart}${linePart}`
          );
        }
        console.log();
      }

      console.log(
        chalk.gray(
          'Tip: Use `configbound export --config <file> --name <export>` to export a specific configuration.'
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      } else {
        console.error(chalk.red(`Error: ${String(error)}`));
      }
      process.exit(1);
    }
  }

  @Option({
    flags: '-r, --recursive [boolean]',
    description: 'Search subdirectories (default: true)'
  })
  parseRecursive(val: string): boolean {
    return val !== 'false';
  }
}
