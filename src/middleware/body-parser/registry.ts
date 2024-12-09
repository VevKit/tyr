// src/middleware/body-parser/registry.ts
import type { BodyParser } from './types';

export class ParserRegistry {
  private parsers: BodyParser[] = [];

  public findParser(contentType: string): BodyParser | undefined {
    if (!contentType) return undefined;
    return this.parsers.find(parser => parser.detect(contentType));
  }

  public registerParser(parser: BodyParser): void {
    this.parsers.push(parser);
  }

  public clear(): void {
    this.parsers = [];
  }
}

export const registry = new ParserRegistry();