import { Module } from '@nestjs/common';
import { ListCommand } from './commands/list.command.js';
import { ExportCommand } from './commands/export.command.js';
import { GenerateCommand } from './commands/generate.command.js';
import { GenerateBindCommand } from './commands/generate-bind.command.js';
import { ConfigDiscoveryService } from './services/config-discovery.service.js';
import { ConfigLoaderService } from './services/config-loader.service.js';
import { SchemaExportService } from './services/schema-export.service.js';
import { FileWriterService } from './services/file-writer.service.js';
import { BindGeneratorService } from './services/bind-generator.service.js';

@Module({
  providers: [
    ListCommand,
    ExportCommand,
    GenerateCommand,
    GenerateBindCommand,
    ConfigDiscoveryService,
    ConfigLoaderService,
    SchemaExportService,
    FileWriterService,
    BindGeneratorService
  ]
})
export class CliModule {}


