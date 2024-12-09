// src/core/request.ts

import { IncomingMessage } from 'node:http';
import { parse as parseUrl } from 'node:url';
import { registry } from '../middleware/body-parser/registry';
import { BadRequestError } from './errors';
import { ParsedUrlQuery } from 'node:querystring';

export class ServerRequest {
  public params: Record<string, string> = {};
  public query: ParsedUrlQuery;
  public path: string;
  public body: unknown;
  private _raw: IncomingMessage;
  private bodyParsed = false;

  constructor(raw: IncomingMessage) {
    this._raw = raw;
    const parsed = parseUrl(raw.url || '/', true);
    this.path = parsed.pathname || '/';
    this.query = parsed.query;
  }

  get method(): string {
    return this._raw.method || 'GET';
  }

  get headers(): Record<string, string | string[] | undefined> {
    return this._raw.headers;
  }

  get rawRequest(): IncomingMessage {
    return this._raw;
  }

  public async getBody<T = unknown>(): Promise<T> {
    if (this.bodyParsed) {
      return this.body as T;
    }

    const contentType = this.headers['content-type'];
    if (!contentType) {
      throw new BadRequestError('Content-Type header missing');
    }

    const parser = registry.findParser(contentType.toString());
    if (!parser) {
      throw new BadRequestError(`Unsupported content type: ${contentType}`);
    }

    const result = await parser.parse(this);
    this.body = result.parsed;
    this.bodyParsed = true;

    return this.body as T;
  }
}