// src/middleware/body-parser/json.ts

import { BadRequestError } from '../../core/errors';
import type { ServerRequest } from '../../core/request';
import { BaseParser } from './base';
import type { ParserResult, JsonParserOptions, BaseParserOptions } from './types';

export class JsonParser extends BaseParser {
  private jsonOptions: Omit<JsonParserOptions, keyof BaseParserOptions>;

  constructor(options: JsonParserOptions = {}) {
    const { strict, reviver, ...baseOptions } = options;
    
    super({
      ...baseOptions,
      types: ['application/json']
    });

    this.jsonOptions = {
      strict: strict ?? true,
      reviver
    };
  }

  detect(contentType: string): boolean {
    return contentType.toLowerCase().includes('application/json');
  }

  async parse(req: ServerRequest, options?: JsonParserOptions): Promise<ParserResult<unknown>> {
    // Update options if provided
    if (options) {
      const { strict, reviver, ...baseOptions } = options;
      this.jsonOptions = {
        strict: strict ?? this.jsonOptions.strict,
        reviver: reviver ?? this.jsonOptions.reviver
      };
      Object.assign(this.options, baseOptions);
    }

    const raw = await this.getRawBody(req);
    
    try {
      // Handle empty body in strict mode
      if (this.jsonOptions.strict && raw.length === 0) {
        throw new BadRequestError('Empty body not allowed in strict mode');
      }

      // Parse JSON with optional reviver
      const parsed = raw.length === 0 ? {} : 
        JSON.parse(raw.toString(), this.jsonOptions.reviver);

      return {
        parsed,
        raw,
        type: 'application/json'
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestError('Invalid JSON format');
      }
      throw error;
    }
  }
}