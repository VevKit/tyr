// src/middleware/body-parser/raw.ts

import { BadRequestError } from '@/core/errors';
import type { ServerRequest } from '../../core/request';
import type { RawParserOptions } from './types';
import { BaseParser } from './base';
import { type ParserResult } from './types';
import { parseBytes } from '@/utils/parseBytes';

export class RawParser extends BaseParser {
  constructor(options: RawParserOptions = {}) {
    super({
      limit: typeof options.limit === 'string' ? parseBytes(options.limit) : options.limit,
      types: Array.isArray(options.type) ? options.type : options.type ? [options.type] : undefined
    });
  }

  detect(contentType: string): boolean {
    // If specific types are defined, validate against them
    if (this.options.types?.length) {
      return this.validateContentType(contentType);
    }
    // Otherwise, accept any content type for raw parsing
    return true;
  }

  async parse(req: ServerRequest, options?: RawParserOptions): Promise<ParserResult<Buffer>> {
    // Update options if provided
    if (options) {
      this.options = {
        ...this.options,
        limit: typeof options.limit === 'string' ? parseBytes(options.limit) : options.limit,
        types: Array.isArray(options.type) ? options.type : options.type ? [options.type] : this.options.types
      };
    }

    const raw = await this.getRawBody(req);
    
    return {
      parsed: raw,
      raw,
      type: req.headers['content-type'] as string || 'application/octet-stream'
    };
  }

  protected async getRawBody(req: ServerRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      
      req.rawRequest.on('data', (chunk: Buffer) => {
        size += chunk.length;
        
        if (this.options.limit && size > this.options.limit) {
          reject(new BadRequestError('Request body too large'));
          return;
        }
        
        chunks.push(chunk);
      });
      
      req.rawRequest.on('end', () => resolve(Buffer.concat(chunks)));
      req.rawRequest.on('error', reject);
    });
  }
}