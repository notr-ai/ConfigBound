import { Module } from '@nestjs/common';
import { ListCommand } from './commands/list.command.js';
import { ExportCommand } from './commands/export.command.js';
import { ConfigDiscoveryService } from './services/config-discovery.service.js';
import { ConfigLoaderService } from './services/config-loader.service.js';
import { SchemaExportService } from './services/schema-export.service.js';
import { FileWriterService } from './services/file-writer.service.js';

@Module({
  providers: [
    ListCommand,
    ExportCommand,
    ConfigDiscoveryService,
    ConfigLoaderService,
    SchemaExportService,
    FileWriterService
  ]
})
export class CliModule {}


