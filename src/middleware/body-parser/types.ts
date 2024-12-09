import type { ServerRequest } from '../../core/request';

export interface ParserResult<T = unknown> {
  parsed: T;
  raw: Buffer;
  type: string;
}

export interface BaseParserOptions {
  /**
   * Maximum size of the body in bytes
   */
  limit?: number;

  /**
   * Content types this parser can handle
   */
  types?: string[];
}

export interface JsonParserOptions extends BaseParserOptions {
  /**
   * Requires valid JSON structure
   * @default true
   */
  strict?: boolean;

  /**
   * Reviver function for JSON.parse
   */
  reviver?: (key: string, value: any) => any;
}

export interface UrlEncodedParserOptions extends BaseParserOptions {
  /**
   * Parse extended syntax with rich objects and arrays
   * @default true
   */
  extended?: boolean;
}

export interface TextParserOptions extends BaseParserOptions {
  /**
   * Default character set for text parsing
   * @default 'utf-8'
   */
  defaultCharset?: string;
}

export interface RawParserOptions extends BaseParserOptions {
  /**
   * Specific content types to handle
   */
  type?: string | string[];
}

export interface MultipartParserOptions extends BaseParserOptions {
  /**
   * Maximum number of fields
   * @default 1000
   */
  maxFields?: number;

  /**
   * Maximum field name size
   * @default 100
   */
  maxFieldNameSize?: number;

  /**
   * Maximum field value size
   * @default 1MB
   */
  maxFieldSize?: number;

  /**
   * Maximum file size
   * @default 10MB
   */
  maxFileSize?: number;

  /**
   * Directory for file uploads
   * @default os.tmpdir()
   */
  tempDir?: string;

  /**
   * Preserve file extensions when saving
   * @default true
   */
  preserveExtension?: boolean;
}

export interface MultipartFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer?: Buffer;
  size: number;
  stream?: NodeJS.ReadableStream;
}

export interface MultipartField {
  fieldname: string;
  value: string;
}

export interface BodyParser {
  detect(contentType: string): boolean;
  parse(req: ServerRequest, options?: unknown): Promise<ParserResult>;
  cleanup?(): Promise<void>;
}