// src/middleware/body-parser/base.ts

import { createHash } from 'crypto';
import { BadRequestError } from '../../core/errors';
import type { ServerRequest } from '../../core/request';
import type { BodyParser, BaseParserOptions, ParserResult } from './types';

export abstract class BaseParser implements BodyParser {
  protected constructor(protected options: BaseParserOptions = {}) {
    this.options = {
      limit: 1024 * 1024, // 1MB default
      ...options
    };
  }

  abstract detect(contentType: string): boolean;

  abstract parse(req: ServerRequest, options?: unknown): Promise<ParserResult>;

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

  protected generateId(prefix = ''): string {
    return prefix + createHash('sha256')
      .update(Date.now().toString())
      .digest('hex')
      .slice(0, 16);
  }

  protected validateContentType(contentType: string): boolean {
    if (!this.options.types?.length) {
      return true;
    }

    return this.options.types.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
  }

  async cleanup(): Promise<void> {
    // Base implementation does nothing
  }
}