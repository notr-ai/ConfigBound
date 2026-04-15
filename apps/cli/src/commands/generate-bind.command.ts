import { Command, CommandRunner, Option } from 'nest-commander';
import {
  BindGeneratorService,
  type BindGeneratorMode,
  type BindNames
} from '../services/bind-generator.service.js';
import chalk from 'chalk';
import * as readline from 'readline';
import * as path from 'path';

interface GenerateBindCommandOptions {
  output?: string;
  type?: BindGeneratorMode;
  dryRun?: boolean;
}

@Command({
  name: 'bind',
  description: 'Scaffold a new bind',
  arguments: '<name>',
  argsDescription: {
    name: 'The bind name in kebab-case (e.g. 1password, vault, aws-ssm)'
  }
})
export class GenerateBindCommand extends CommandRunner {
  constructor(private readonly generatorService: BindGeneratorService) {
    super();
  }

  async run(
    [name]: string[],
    options?: GenerateBindCommandOptions
  ): Promise<void> {
    if (!name) {
      this.command.error(
        'bind name is required.\nUsage: configbound generate bind <name>'
      );
    }

    const names = this.generatorService.deriveNames(name);
    const outputDir = options?.output
      ? path.resolve(options.output)
      : process.cwd();

    const mode: BindGeneratorMode = options?.type ?? (await this.promptMode());

    const files = this.generatorService.renderFiles(names, mode);

    if (options?.dryRun) {
      console.log(chalk.blue('\nFiles that would be generated:\n'));
      for (const file of files) {
        const fullPath = path.join(outputDir, file.relativePath);
        console.log(chalk.cyan(`  ${fullPath}`));
        console.log(chalk.gray('  ' + '─'.repeat(60)));
        console.log(
          file.content
            .split('\n')
            .map((line) => chalk.gray(`  ${line}`))
            .join('\n')
        );
        console.log();
      }
      console.log(chalk.yellow('Dry run — no files written.'));
      return;
    }

    console.log(
      chalk.blue(
        `\nGenerating ${mode === 'package' ? 'community bind package' : 'embedded bind class'} for ${chalk.bold(names.pascal)}...\n`
      )
    );

    this.generatorService.writeFiles(files, outputDir);

    console.log(chalk.green('Done! Generated files:'));
    for (const file of files) {
      console.log(chalk.cyan(`  ${path.join(outputDir, file.relativePath)}`));
    }

    this.printNextSteps(names, mode, outputDir);
  }

  private async promptMode(): Promise<BindGeneratorMode> {
    console.log(chalk.blue('\nWhat would you like to generate?\n'));
    console.log(
      `  ${chalk.cyan('1.')} Community bind package ${chalk.gray('(package.json, tsconfig, src/) — standalone, publishable to npm')}`
    );
    console.log(
      `  ${chalk.cyan('2.')} Embedded bind class file ${chalk.gray('— lives in your project, not published')}`
    );

    while (true) {
      const answer = await new Promise<string>((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        rl.question(chalk.yellow('\nSelect (1 or 2): '), (ans) => {
          rl.close();
          resolve(ans.trim());
        });
      });

      if (answer === '1') return 'package';
      if (answer === '2') return 'embedded';

      console.log(chalk.red('  Invalid selection. Please enter 1 or 2.'));
    }
  }

  private printNextSteps(
    names: BindNames,
    mode: BindGeneratorMode,
    outputDir: string
  ): void {
    console.log(chalk.blue('\nNext steps:\n'));

    if (mode === 'package') {
      const packageDir = path.join(outputDir, `bind-${names.kebab}`);
      console.log(
        `  ${chalk.cyan('1.')} Add your SDK dependency to ${chalk.bold(path.join(packageDir, 'package.json'))}`
      );
      console.log(
        `  ${chalk.cyan('2.')} Fill in the ${chalk.bold(`create()`)} method in ${chalk.bold(path.join(packageDir, 'src', `${names.pascal}Bind.ts`))}`
      );
      console.log(
        `  ${chalk.cyan('3.')} Run ${chalk.bold('npm install')} in the package directory`
      );
      console.log(
        `  ${chalk.cyan('4.')} When ready to publish, set ${chalk.bold('"private": false')} in package.json`
      );
    } else {
      const classFile = path.join(outputDir, `${names.pascal}Bind.ts`);
      console.log(
        `  ${chalk.cyan('1.')} Add your SDK to your project's dependencies`
      );
      console.log(
        `  ${chalk.cyan('2.')} Fill in the ${chalk.bold(`create()`)} method in ${chalk.bold(classFile)}`
      );
      console.log(
        `  ${chalk.cyan('3.')} Pass an instance to ${chalk.bold('ConfigBound.createConfig(..., { binds: [bind] })')}`
      );
    }

    console.log();
  }

  @Option({
    flags: '-o, --output <dir>',
    description: 'Output directory (default: current directory)'
  })
  parseOutput(val: string): string {
    return val;
  }

  @Option({
    flags: '--type <type>',
    description:
      'Generation mode: package or embedded (skips interactive prompt)'
  })
  parseType(val: string): BindGeneratorMode {
    if (val !== 'package' && val !== 'embedded') {
      throw new Error(`Invalid type: ${val}. Must be "package" or "embedded".`);
    }
    return val;
  }

  @Option({
    flags: '--dry-run',
    description: 'Preview generated files without writing'
  })
  parseDryRun(): boolean {
    return true;
  }
}
