import { Command, CommandRunner, Option } from 'nest-commander';
import { ConfigLoaderService } from '../services/config-loader.service.js';
import { ConfigDiscoveryService } from '../services/config-discovery.service.js';
import {
  SchemaExportService,
  type ExportFormat
} from '../services/schema-export.service.js';
import { FileWriterService } from '../services/file-writer.service.js';
import chalk from 'chalk';
import * as readline from 'readline';

interface ExportCommandOptions {
  config?: string;
  format: ExportFormat;
  output?: string;
  includeOmitted?: boolean;
  pretty?: boolean;
  name?: string;
}

@Command({
  name: 'export',
  description: 'Export ConfigBound schema in various formats'
})
export class ExportCommand extends CommandRunner {
  constructor(
    private readonly loaderService: ConfigLoaderService,
    private readonly discoveryService: ConfigDiscoveryService,
    private readonly exportService: SchemaExportService,
    private readonly writerService: FileWriterService
  ) {
    super();
  }

  async run(
    _passedParams: string[],
    options?: ExportCommandOptions
  ): Promise<void> {
    try {
      let configPath: string;
      let exportName: string | undefined;

      // If no explicit --config, auto-discover
      if (!options?.config) {
        const discovered = await this.discoverAndSelect();
        if (!discovered) {
          console.log(chalk.yellow('Export cancelled.'));
          return;
        }
        configPath = discovered.filePath;
        exportName =
          discovered.exportName === 'default'
            ? undefined
            : discovered.exportName;
      } else {
        // Explicit config path provided
        configPath = options.config;
        exportName = options.name;
      }

      const format = options?.format || 'json';
      const includeOmitted = options?.includeOmitted || false;
      const pretty = options?.pretty !== false;
      const output = options?.output;

      console.log(chalk.blue('Loading configuration...'));
      const config = await this.loaderService.loadConfig(
        configPath,
        exportName
      );

      console.log(chalk.green(`Loaded config: ${chalk.bold(config.name)}`));

      const exportedSchema = this.exportService.exportToString(
        config.name,
        config.sections,
        config.instance,
        {
          format,
          includeOmitted,
          pretty
        }
      );

      if (output) {
        this.writerService.writeToFile(output, exportedSchema);
        console.log(chalk.green(`Schema exported to: ${output}`));
      } else {
        console.log(chalk.blue('\nExported schema:\n'));
        this.writerService.writeToStdout(exportedSchema);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`Error: ${error.message}`));
      } else {
        console.error(chalk.red(`Error: ${String(error)}`));
      }
      process.exit(1);
    }
  }

  private async discoverAndSelect(): Promise<{
    filePath: string;
    exportName: string;
  } | null> {
    const startTime = Date.now();
    console.log(chalk.blue('Searching for ConfigBound configurations...'));

    const configs = await this.discoveryService.discoverConfigs(
      process.cwd(),
      true
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.gray(`Search completed in ${elapsed}s`));

    if (configs.length === 0) {
      console.log(
        chalk.yellow('\nNo ConfigBound configurations found in project.')
      );
      console.log(
        chalk.gray(
          'Tip: Use --config <path> to specify a config file explicitly.'
        )
      );
      return null;
    }

    // Auto-select if only one config found
    if (configs.length === 1) {
      const selected = configs[0];
      const exportType = selected.isDefault ? 'default' : 'named';
      const relativePath = selected.filePath.replace(process.cwd() + '/', '');
      console.log(
        chalk.green(
          `\nFound 1 configuration - auto-selected: ${chalk.bold(selected.configName || 'unnamed')} (${exportType} export: ${selected.exportName})`
        )
      );
      console.log(chalk.gray(`  from ${relativePath}\n`));

      return {
        filePath: selected.filePath,
        exportName: selected.exportName
      };
    }

    // Multiple configs - show menu
    console.log(chalk.green(`\nFound ${configs.length} configurations:\n`));

    configs.forEach((config: (typeof configs)[0], index: number) => {
      const exportType = config.isDefault ? '(default)' : '(named)';
      const configNamePart = config.configName
        ? chalk.bold(config.configName)
        : chalk.gray('unnamed');
      const relativePath = config.filePath.replace(process.cwd() + '/', '');
      console.log(
        `${chalk.cyan((index + 1).toString().padStart(2))}. ${configNamePart} ${chalk.gray(exportType + ' - ' + config.exportName)}`
      );
      console.log(`    ${chalk.gray(relativePath)}`);
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        chalk.yellow(
          `\nSelect configuration (1-${configs.length}) or Ctrl+C to cancel: `
        ),
        (answer) => {
          rl.close();
          resolve(answer);
        }
      );
    });

    const selectedIndex = parseInt(answer, 10) - 1;

    if (
      isNaN(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= configs.length
    ) {
      console.log(chalk.red('Invalid selection.'));
      return null;
    }

    const selected = configs[selectedIndex];
    console.log();
    return {
      filePath: selected.filePath,
      exportName: selected.exportName
    };
  }

  @Option({
    flags: '-c, --config <path>',
    description: 'Path to config file'
  })
  parseConfig(val: string): string {
    return val;
  }

  @Option({
    flags: '-f, --format <format>',
    description: 'Output format: json, yaml, env (default: json)',
    defaultValue: 'json'
  })
  parseFormat(val: string): ExportFormat {
    const validFormats: ExportFormat[] = ['json', 'yaml', 'env'];
    if (!validFormats.includes(val as ExportFormat)) {
      throw new Error(
        `Invalid format: ${val}. Valid formats: ${validFormats.join(', ')}`
      );
    }
    return val as ExportFormat;
  }

  @Option({
    flags: '-o, --output <path>',
    description: 'Output file path (default: stdout)'
  })
  parseOutput(val: string): string {
    return val;
  }

  @Option({
    flags: '--include-omitted',
    description: 'Include elements marked with omitFromSchema: true'
  })
  parseIncludeOmitted(): boolean {
    return true;
  }

  @Option({
    flags: '--pretty [boolean]',
    description: 'Pretty-print JSON output (default: true)',
    defaultValue: true
  })
  parsePretty(val: string): boolean {
    return val !== 'false';
  }

  @Option({
    flags: '--name <name>',
    description: 'Export named variable when file has multiple exports'
  })
  parseName(val: string): string {
    return val;
  }
}
