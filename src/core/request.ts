// src/core/request.ts

import { IncomingMessage } from 'node:http';
import { parse as parseUrl } from 'node:url';
import { ParsedUrlQuery, parse as parseQuery } from 'node:querystring';

export class ServerRequest {
  public params: Record<string, string> = {};
  public query: ParsedUrlQuery;
  public path: string;
  public body: unknown;
  private bodyParsed = false;

  constructor(private raw: IncomingMessage) {
    // Parse URL immediately - we'll always need this
    const parsed = parseUrl(raw.url || '/', true);
    this.path = parsed.pathname || '/';
    this.query = parsed.query;
  }

  get method(): string {
    return this.raw.method || 'GET';
  }

  get headers(): Record<string, string | string[] | undefined> {
    return this.raw.headers;
  }

  // Method to parse and get body
  public async getBody<T = unknown>(): Promise<T> {
    if (this.bodyParsed) {
      return this.body as T;
    }

    const contentType = this.headers['content-type'];
    
    if (contentType?.includes('application/json')) {
      this.body = await this.parseJson();
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      this.body = await this.parseUrlEncoded();
    } else if (contentType?.includes('text/plain')) {
      this.body = await this.parseText();
    } else {
      // For unknown content types, return raw body
      this.body = await this.getRawBody();
    }

    this.bodyParsed = true;
    return this.body as T;
  }

  private async parseJson(): Promise<unknown> {
    const rawBody = await this.getRawBody();
    try {
      return JSON.parse(rawBody.toString());
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }

  private async parseUrlEncoded(): Promise<Record<string, string>> {
    const rawBody = await this.getRawBody();
    return parseQuery(rawBody.toString()) as Record<string, string>;
  }

  private async parseText(): Promise<string> {
    const rawBody = await this.getRawBody();
    return rawBody.toString();
  }

  private getRawBody(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      this.raw.on('data', (chunk: Buffer) => chunks.push(chunk));
      
      this.raw.on('end', () => resolve(Buffer.concat(chunks)));
      
      this.raw.on('error', reject);
    });
  }
}