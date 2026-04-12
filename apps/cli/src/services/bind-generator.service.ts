import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { FileWriterService } from './file-writer.service.js';

const DIGIT_WORDS = new Map([
  ['1', 'One'],
  ['2', 'Two'],
  ['3', 'Three'],
  ['4', 'Four'],
  ['5', 'Five'],
  ['6', 'Six'],
  ['7', 'Seven'],
  ['8', 'Eight'],
  ['9', 'Nine'],
  ['10', 'Ten']
]);

function digitWordsPrefix(digits: string): string {
  return DIGIT_WORDS.get(digits) ?? `N${digits}`;
}

export type BindGeneratorMode = 'package' | 'embedded';

export interface BindNames {
  kebab: string;
  pascal: string;
}

export interface GeneratedFile {
  relativePath: string;
  content: string;
}

@Injectable()
export class BindGeneratorService {
  constructor(private readonly fileWriter: FileWriterService) {}

  deriveNames(input: string): BindNames {
    const kebab = input
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const pascal = kebab
      .split('-')
      .map((part) => {
        // Handle numeric-leading segments (e.g. "1password" → "OnePassword")
        const withoutLeadingDigits = part.replace(/^\d+/, digitWordsPrefix);
        return (
          withoutLeadingDigits.charAt(0).toUpperCase() +
          withoutLeadingDigits.slice(1)
        );
      })
      .join('');

    return { kebab, pascal };
  }

  renderFiles(names: BindNames, mode: BindGeneratorMode): GeneratedFile[] {
    if (mode === 'embedded') {
      return [
        {
          relativePath: `${names.pascal}Bind.ts`,
          content: this.renderBindClass(names)
        }
      ];
    }

    const packageDir = `bind-${names.kebab}`;
    return [
      {
        relativePath: path.join(packageDir, 'src', `${names.pascal}Bind.ts`),
        content: this.renderBindClass(names)
      },
      {
        relativePath: path.join(packageDir, 'src', 'index.ts'),
        content: this.renderIndex(names)
      },
      {
        relativePath: path.join(packageDir, 'package.json'),
        content: this.renderPackageJson(names)
      },
      {
        relativePath: path.join(packageDir, 'tsconfig.json'),
        content: this.renderTsConfig()
      },
      {
        relativePath: path.join(packageDir, 'eslint.config.mjs'),
        content: this.renderEslintConfig()
      }
    ];
  }

  writeFiles(files: GeneratedFile[], outputDir: string): void {
    for (const file of files) {
      const fullPath = path.join(outputDir, file.relativePath);
      this.fileWriter.writeToFile(fullPath, file.content);
    }
  }

  private renderBindClass(names: BindNames): string {
    return `import { Bind } from '@config-bound/config-bound/bind';

/**
 * Options for constructing a ${names.pascal}Bind.
 * Add the SDK client / credential options for ${names.pascal} here.
 */
export interface ${names.pascal}BindOptions {
  // e.g. token?: string; endpoint?: string;
}

/**
 * A {@link Bind} that retrieves values from ${names.pascal}.
 *
 * Uses a static factory method ({@link ${names.pascal}Bind.create}) to pre-load values
 * at startup into a synchronous cache, satisfying the {@link Bind} contract without
 * requiring changes to the core library.
 *
 * @example
 * \`\`\`typescript
 * const bind = await ${names.pascal}Bind.create({ token: process.env.${names.kebab.toUpperCase().replace(/-/g, '_')}_TOKEN });
 * const config = ConfigBound.createConfig(schema, { binds: [bind] });
 * \`\`\`
 */
export class ${names.pascal}Bind extends Bind {
  private readonly cache: Map<string, unknown>;

  private constructor(cache: Map<string, unknown>) {
    super('${names.pascal}');
    this.cache = cache;
  }

  /**
   * Creates a ${names.pascal}Bind by pre-loading values from the source.
   *
   * Call this once at application startup and pass the returned instance to
   * \`ConfigBound.createConfig\`.
   */
  static async create(_options: ${names.pascal}BindOptions): Promise<${names.pascal}Bind> {
    const cache = new Map<string, unknown>();

    // TODO: Initialize the SDK client using \`options\`, fetch values, and
    // populate \`cache\` with entries keyed by the full element path
    // (format: "sectionName.elementName"). For example:
    //
    //   const client = new SdkClient(options);
    //   const values = await client.listValues();
    //   for (const value of values) {
    //     cache.set(value.path, value.data);
    //   }
    return new ${names.pascal}Bind(cache);
  }

  retrieve<T>(elementName: string): T | undefined {
    return this.cache.get(elementName) as T | undefined;
  }
}
`;
  }

  private renderIndex(names: BindNames): string {
    return `export { ${names.pascal}Bind, type ${names.pascal}BindOptions } from './${names.pascal}Bind.js';
`;
  }

  private renderPackageJson(names: BindNames): string {
    return `{
  "name": "configbound-bind-${names.kebab}",
  "version": "0.1.0",
  "description": "${names.pascal} bind for ConfigBound",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "clean": "rimraf dist",
    "test": "jest",
    "lint": "eslint src/**/*.ts --fix",
    "lint:ci": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts",
    "format:ci": "prettier --check src/**/*.ts"
  },
  "keywords": ["configbound", "config", "${names.kebab}"],
  "license": "MIT",
  "dependencies": {
    "@config-bound/config-bound": "^0.1.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.0.0",
    "eslint": "^9.0.0",
    "jest": "^30.0.0",
    "rimraf": "^6.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^6.0.0",
    "typescript-eslint": "^8.0.0"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org"
  }
}
`;
  }

  private renderTsConfig(): string {
    return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
`;
  }

  private renderEslintConfig(): string {
    return `import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
];
`;
  }
}
