// src/middleware/body-parser/text.ts

import { BadRequestError } from '../../core/errors';
import type { ServerRequest } from '../../core/request';
import { BaseParser } from './base';
import type { BaseParserOptions, ParserResult, TextParserOptions } from './types';

export class TextParser extends BaseParser {
  private textOptions: Omit<TextParserOptions, keyof BaseParserOptions>;

  constructor(options: TextParserOptions = {}) {
    const { defaultCharset, ...baseOptions } = options;
    
    super({
      ...baseOptions,
      types: ['text/plain']
    });

    this.textOptions = {
      defaultCharset: defaultCharset ?? 'utf-8'
    };
  }

  detect(contentType: string): boolean {
    return contentType.toLowerCase().includes('text/');
  }

  async parse(req: ServerRequest, options?: TextParserOptions): Promise<ParserResult<string>> {
    // Update options if provided
    if (options) {
      const { defaultCharset, ...baseOptions } = options;
      this.textOptions = {
        defaultCharset: defaultCharset ?? this.textOptions.defaultCharset
      };
      Object.assign(this.options, baseOptions);
    }

    const raw = await this.getRawBody(req);

    try {
      // Determine charset from content-type header or use default
      const charset = this.getCharset(req) ?? this.textOptions.defaultCharset;
      
      // Handle empty body
      if (raw.length === 0) {
        return {
          parsed: '',
          raw,
          type: 'text/plain'
        };
      }

      // Decode the buffer using the determined charset
      const parsed = raw.toString(charset as BufferEncoding);

      return {
        parsed,
        raw,
        type: req.headers['content-type']?.toString() || 'text/plain'
      };
    } catch (error) {
      if (error instanceof TypeError) {
        throw new BadRequestError('Invalid character encoding');
      }
      throw error;
    }
  }

  private getCharset(req: ServerRequest): string | undefined {
    const contentType = req.headers['content-type'];
    if (!contentType) return undefined;

    // Handle string array case
    const contentTypeStr = Array.isArray(contentType) ? contentType[0] : contentType;
    if (!contentTypeStr) return undefined;

    const match = contentTypeStr.match(/charset=([^;]+)/i);
    return match?.[1]?.toLowerCase() ?? undefined;
  }
}
