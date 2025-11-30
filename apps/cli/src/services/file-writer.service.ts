import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileWriterService {
  writeToFile(filePath: string, content: string): void {
    const absolutePath = path.resolve(filePath);
    const directory = path.dirname(absolutePath);

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    fs.writeFileSync(absolutePath, content, 'utf8');
  }

  writeToStdout(content: string): void {
    process.stdout.write(content);
    if (!content.endsWith('\n')) {
      process.stdout.write('\n');
    }
  }

  write(content: string, outputPath?: string): void {
    if (outputPath) {
      this.writeToFile(outputPath, content);
    } else {
      this.writeToStdout(content);
    }
  }
}
