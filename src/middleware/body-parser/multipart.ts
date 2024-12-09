// src/middleware/body-parser/multipart.ts
import { createHash } from 'crypto';
import { createWriteStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { BadRequestError } from '../../core/errors';
import type { ServerRequest } from '../../core/request';
import { BaseParser } from './base';
import type { 
  ParserResult, 
  MultipartParserOptions, 
  MultipartFile,
  MultipartField, 
  BaseParserOptions
} from './types';

interface Part {
  headers: Record<string, string>;
  data: Buffer;
}

interface Boundary {
  start: Buffer;
  end: Buffer;
}

export class MultipartParser extends BaseParser {
  private multipartOptions: Omit<MultipartParserOptions, keyof BaseParserOptions>;
  private tempDir: string;
  private boundary?: string;

  constructor(options: MultipartParserOptions = {}) {
    const {
      maxFields,
      maxFieldNameSize,
      maxFieldSize,
      maxFileSize,
      tempDir,
      preserveExtension,
      ...baseOptions
    } = options;

    super({
      ...baseOptions,
      types: ['multipart/form-data']
    });

    this.multipartOptions = {
      maxFields: maxFields ?? 1000,
      maxFieldNameSize: maxFieldNameSize ?? 100,
      maxFieldSize: maxFieldSize ?? 1024 * 1024, // 1MB
      maxFileSize: maxFileSize ?? 10 * 1024 * 1024, // 10MB
      tempDir: tempDir ?? tmpdir(),
      preserveExtension: preserveExtension ?? true
    };

    this.tempDir = join(
      this.multipartOptions.tempDir!,
      `tyr-upload-${createHash('sha256').update(Date.now().toString()).digest('hex')}`
    );
  }

  detect(contentType: string): boolean {
    return contentType.toLowerCase().includes('multipart/form-data');
  }

  async parse(
    req: ServerRequest, 
    options?: MultipartParserOptions
  ): Promise<ParserResult<{ fields: MultipartField[], files: MultipartFile[] }>> {
    // Update options if provided
    if (options) {
      const {
        maxFields,
        maxFieldNameSize,
        maxFieldSize,
        maxFileSize,
        tempDir,
        preserveExtension,
        ...baseOptions
      } = options;

      this.multipartOptions = {
        maxFields: maxFields ?? this.multipartOptions.maxFields,
        maxFieldNameSize: maxFieldNameSize ?? this.multipartOptions.maxFieldNameSize,
        maxFieldSize: maxFieldSize ?? this.multipartOptions.maxFieldSize,
        maxFileSize: maxFileSize ?? this.multipartOptions.maxFileSize,
        tempDir: tempDir ?? this.multipartOptions.tempDir,
        preserveExtension: preserveExtension ?? this.multipartOptions.preserveExtension
      };
      Object.assign(this.options, baseOptions);
    }

    // Ensure temp directory exists
    await mkdir(this.tempDir, { recursive: true });

    try {
      // Extract boundary from content type
      this.boundary = this.extractBoundary(req);
      const raw = await this.getRawBody(req);

      // Parse the multipart data
      const parts = await this.parseParts(raw);
      const { fields, files } = await this.processParts(parts);

      return {
        parsed: { fields, files },
        raw,
        type: 'multipart/form-data'
      };
    } catch (error) {
      // Clean up temp files on error
      await this.cleanup();
      throw error;
    }
  }

  private extractBoundary(req: ServerRequest): string {
    const contentType = req.headers['content-type'];
    if (!contentType) {
      throw new BadRequestError('Missing content type');
    }

    const contentTypeStr = Array.isArray(contentType) ? contentType[0] : contentType;
    const match = contentTypeStr?.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    
    if (!match) {
      throw new BadRequestError('No multipart boundary found');
    }

    return '--' + (match[1] || match[2]);
  }



  private async parseParts(raw: Buffer): Promise<Part[]> {
    if (!this.boundary) {
      throw new BadRequestError('Boundary not set');
    }

    const parts: Part[] = [];
    let currentPart: { headers: Record<string, string>; data: Buffer[] } | null = null;
    
    // Create boundary markers
    const boundaryMarker = Buffer.from(`\r\n${this.boundary}`);
    const finalBoundaryMarker = Buffer.from(`\r\n${this.boundary}--`);

    // Skip initial boundary
    let position = raw.indexOf(this.boundary) + this.boundary.length;
    
    while (position < raw.length) {
      // Check for final boundary
      if (raw.slice(position).indexOf(finalBoundaryMarker) === 0) {
        break;
      }

      // Skip line break after boundary
      if (raw[position] === 0x0D && raw[position + 1] === 0x0A) {
        position += 2;
      }

      // Parse headers
      if (!currentPart) {
        currentPart = { headers: {}, data: [] };
        
        // Parse headers until empty line
        let headerLine;
        while (position < raw.length) {
          const lineEnd = raw.indexOf('\r\n', position);
          if (lineEnd === -1) break;
          
          headerLine = raw.slice(position, lineEnd).toString();
          position = lineEnd + 2;
          
          // Empty line marks end of headers
          if (headerLine === '') break;
          
          const [key, ...valueParts] = headerLine.split(':');
          const value = valueParts.join(':').trim();
          currentPart.headers[key?.toLowerCase() ?? ''] = value;
        }
      }

      // Find next boundary
      const nextBoundary = raw.indexOf(boundaryMarker, position);
      const dataEnd = nextBoundary === -1 ? raw.length : nextBoundary;
      
      // Add data to current part
      currentPart.data.push(raw.slice(position, dataEnd));
      
      // If we found a boundary, complete the current part
      if (nextBoundary !== -1) {
        parts.push({
          headers: currentPart.headers,
          data: Buffer.concat(currentPart.data)
        });
        currentPart = null;
        position = nextBoundary + boundaryMarker.length;
      } else {
        position = dataEnd;
      }
    }

    return parts;
  }

  private async processParts(parts: Part[]): Promise<{
    fields: MultipartField[];
    files: MultipartFile[];
  }> {
    const fields: MultipartField[] = [];
    const files: MultipartFile[] = [];
    let fieldCount = 0;

    for (const part of parts) {
      if (fieldCount >= this.multipartOptions.maxFields!) {
        throw new BadRequestError('Too many fields');
      }

      const contentDisposition = part.headers['content-disposition'];
      if (!contentDisposition) {
        continue;
      }

      // Parse content disposition
      const nameMatch = contentDisposition.match(/name="([^"]+)"/);
      if (!nameMatch) {
        continue;
      }

      const fieldname = nameMatch[1];
      if (fieldname?.length! > this.multipartOptions.maxFieldNameSize!) {
        throw new BadRequestError('Field name too long');
      }

      // Check if this is a file
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      
      if (filenameMatch && fieldname && filenameMatch[1]) {
        // Handle file upload
        const file = await this.processFile(fieldname, filenameMatch[1], part);
        files.push(file);
      } else {
        // Handle regular field
        if (part.data.length > this.multipartOptions.maxFieldSize!) {
          throw new BadRequestError('Field value too large');
        }

        fields.push({
          fieldname: fieldname!,
          value: part.data.toString()
        });
      }

      fieldCount++;
    }

    return { fields, files };
  }

  private async processFile(
    fieldname: string, 
    originalname: string, 
    part: Part
  ): Promise<MultipartFile> {
    if (part.data.length > this.multipartOptions.maxFileSize!) {
      throw new BadRequestError('File too large');
    }

    // Generate unique filename
    const ext = this.multipartOptions.preserveExtension 
      ? originalname.slice(originalname.lastIndexOf('.'))
      : '';
    
    const filename = this.generateId('file-') + ext;
    const filepath = join(this.tempDir, filename);

    // Write file to disk
    await new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(filepath);
      const readStream = Readable.from(part.data);

      writeStream.on('error', reject);
      writeStream.on('finish', resolve);

      readStream.pipe(writeStream);
    });

    return {
      fieldname,
      originalname,
      encoding: part.headers['content-transfer-encoding'] || '7bit',
      mimetype: part.headers['content-type'] || 'application/octet-stream',
      size: part.data.length,
      stream: Readable.from(part.data)
    };
  }

  async cleanup(): Promise<void> {
    try {
      // Remove temp directory and its contents
      await rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      // Log error but don't throw
      console.error('Error cleaning up multipart temp files:', error);
    }
  }
}