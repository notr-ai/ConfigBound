import { Injectable } from '@nestjs/common';
import { Project, Node, SyntaxKind, SourceFile } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { ensureError } from '@config-bound/config-bound/utilities';

export interface DiscoveredConfig {
  filePath: string;
  exportName: string;
  isDefault: boolean;
  configName?: string;
  lineNumber: number;
}

@Injectable()
export class ConfigDiscoveryService {
  async discoverConfigs(
    searchPath: string,
    recursive: boolean = true
  ): Promise<DiscoveredConfig[]> {
    const tsFiles = this.findTypeScriptFiles(searchPath, recursive);
    const discovered: DiscoveredConfig[] = [];

    // Create a single project instance for all files
    const project = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: false,
        skipLibCheck: true
      }
    });

    // Add all files at once
    for (const filePath of tsFiles) {
      try {
        project.addSourceFileAtPath(filePath);
      } catch (error: unknown) {
        console.warn(`skipping ${filePath}: ${ensureError(error).message}`);
        // Skip files with parse errors
        continue;
      }
    }

    // Now extract configs from all source files
    for (const sourceFile of project.getSourceFiles()) {
      try {
        const configs = this.extractConfigsFromFile(sourceFile);
        discovered.push(...configs);
      } catch (error: unknown) {
        console.warn(`skipping ${sourceFile}: ${ensureError(error).message}`);
        continue;
      }
    }

    return discovered;
  }

  private extractConfigsFromFile(sourceFile: SourceFile): DiscoveredConfig[] {
    const discovered: DiscoveredConfig[] = [];
    const filePath = sourceFile.getFilePath();

    // Find all variable declarations
    const variableStatements = sourceFile.getVariableStatements();

    for (const statement of variableStatements) {
      const declarations = statement.getDeclarations();

      for (const declaration of declarations) {
        const initializer = declaration.getInitializer();
        if (!initializer) continue;

        // Check if it's a call to ConfigBound.createConfig()
        if (this.isConfigBoundCreateConfig(initializer)) {
          const isExported = statement
            .getModifiers()
            .some((mod: Node) => mod.getKind() === SyntaxKind.ExportKeyword);

          if (isExported) {
            const exportName = declaration.getName();
            const configName = this.extractConfigName(initializer);

            discovered.push({
              filePath,
              exportName,
              isDefault: false,
              configName,
              lineNumber: declaration.getStartLineNumber()
            });
          }
        }
      }
    }

    // Check for default exports
    const defaultExport = sourceFile.getDefaultExportSymbol();
    if (defaultExport) {
      const declarations = defaultExport.getDeclarations();
      for (const declaration of declarations) {
        if (Node.isExportAssignment(declaration)) {
          const expression = declaration.getExpression();
          if (this.isConfigBoundCreateConfig(expression)) {
            const configName = this.extractConfigName(expression);
            discovered.push({
              filePath,
              exportName: 'default',
              isDefault: true,
              configName,
              lineNumber: declaration.getStartLineNumber()
            });
          }
        }
      }
    }

    return discovered;
  }

  private isConfigBoundCreateConfig(node: Node): boolean {
    if (!Node.isCallExpression(node)) return false;

    const expression = node.getExpression();

    // Check for ConfigBound.createConfig()
    if (Node.isPropertyAccessExpression(expression)) {
      const obj = expression.getExpression();
      const prop = expression.getName();

      if (
        Node.isIdentifier(obj) &&
        obj.getText() === 'ConfigBound' &&
        prop === 'createConfig'
      ) {
        return true;
      }
    }

    // Check for createConfig() (named import)
    if (Node.isIdentifier(expression)) {
      if (expression.getText() === 'createConfig') {
        return true;
      }
    }

    return false;
  }

  private extractConfigName(node: Node): string | undefined {
    if (!Node.isCallExpression(node)) return undefined;

    const args = node.getArguments();
    if (args.length === 0) return undefined;

    const firstArg = args[0];

    // Look for name property in object literal
    if (Node.isObjectLiteralExpression(firstArg)) {
      const nameProperty = firstArg
        .getProperties()
        .find(
          (prop) => Node.isPropertyAssignment(prop) && prop.getName() === 'name'
        );

      if (nameProperty && Node.isPropertyAssignment(nameProperty)) {
        const initializer = nameProperty.getInitializer();
        if (initializer && Node.isStringLiteral(initializer)) {
          return initializer.getLiteralValue();
        }
      }
    }

    return undefined;
  }

  private findTypeScriptFiles(
    searchPath: string,
    recursive: boolean
  ): string[] {
    const files: string[] = [];
    const excludedDirs = new Set([
      'node_modules',
      'dist',
      'build',
      'coverage',
      '.git',
      '.next',
      '.nuxt',
      'out',
      'public',
      'static',
      '__pycache__',
      'venv',
      'env'
    ]);

    function traverse(dir: string) {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        // Skip directories we can't read
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip excluded directories and hidden directories
        if (entry.isDirectory()) {
          if (excludedDirs.has(entry.name) || entry.name.startsWith('.')) {
            continue;
          }
          if (recursive) {
            traverse(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          // Skip test files and declaration files
          if (
            !entry.name.endsWith('.spec.ts') &&
            !entry.name.endsWith('.test.ts') &&
            !entry.name.endsWith('.d.ts')
          ) {
            files.push(fullPath);
          }
        }
      }
    }

    const stats = fs.statSync(searchPath);
    if (stats.isDirectory()) {
      traverse(searchPath);
    } else if (stats.isFile() && searchPath.endsWith('.ts')) {
      files.push(searchPath);
    }

    return files;
  }
}
