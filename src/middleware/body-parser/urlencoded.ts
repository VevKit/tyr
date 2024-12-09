// src/middleware/body-parser/urlencoded.ts

import { parse as parseQuery } from 'node:querystring';
import { BadRequestError } from '../../core/errors';
import type { ServerRequest } from '../../core/request';
import { BaseParser } from './base';
import type { BaseParserOptions, ParserResult, UrlEncodedParserOptions } from './types';

export class UrlEncodedParser extends BaseParser {
  private urlencodedOptions: Omit<UrlEncodedParserOptions, keyof BaseParserOptions>;

  constructor(options: UrlEncodedParserOptions = {}) {
    const { extended, ...baseOptions } = options;
    
    super({
      ...baseOptions,
      types: ['application/x-www-form-urlencoded']
    });

    this.urlencodedOptions = {
      extended: extended ?? true
    };
  }

  detect(contentType: string): boolean {
    return contentType.toLowerCase().includes('application/x-www-form-urlencoded');
  }

  async parse(req: ServerRequest, options?: UrlEncodedParserOptions): Promise<ParserResult<Record<string, string>>> {
    // Update options if provided
    if (options) {
      const { extended, ...baseOptions } = options;
      this.urlencodedOptions = {
        extended: extended ?? this.urlencodedOptions.extended
      };
      Object.assign(this.options, baseOptions);
    }

    const raw = await this.getRawBody(req);
    
    try {
      // Handle empty body
      if (raw.length === 0) {
        return {
          parsed: {},
          raw,
          type: 'application/x-www-form-urlencoded'
        };
      }

      // Parse the URL-encoded data
      const parsed = parseQuery(
        raw.toString(),
        '&',
        '=',
        this.urlencodedOptions.extended ? {
          maxKeys: 0,
          decodeURIComponent: decodeURIComponent
        } : undefined
      ) as Record<string, string>;

      return {
        parsed,
        raw,
        type: 'application/x-www-form-urlencoded'
      };
    } catch (error) {
      if (error instanceof URIError) {
        throw new BadRequestError('Invalid URL-encoded format');
      }
      throw error;
    }
  }
}