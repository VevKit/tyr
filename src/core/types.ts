// src/core/types.ts
import { ServerRequest } from './request';
import { ServerResponse } from './response';

// HTTP Method Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// Server Configuration
export interface ServerConfig {
  port?: number;
  host?: string;
  bodyParser?: boolean | BodyParserOptions;
  trustProxy?: boolean;
  timeout?: number;
}

// Body Parser Options
export interface BodyParserOptions {
  json?: boolean | JsonParserOptions;
  urlencoded?: boolean | UrlEncodedParserOptions;
  raw?: boolean | RawParserOptions;
  text?: boolean | TextParserOptions;
}

export interface JsonParserOptions {
  limit?: string | number;
  strict?: boolean;
  reviver?: (key: string, value: any) => any;
}

export interface UrlEncodedParserOptions {
  limit?: string | number;
  extended?: boolean;
}

export interface RawParserOptions {
  limit?: string | number;
  type?: string | string[];
}

export interface TextParserOptions {
  limit?: string | number;
  type?: string | string[];
  defaultCharset?: string;
}

// Request Types
export interface RequestParams {
  [key: string]: string;
}

export interface RequestQuery {
  [key: string]: string | string[] | undefined;
}

export interface RequestHeaders {
  [key: string]: string | string[] | undefined;
}

// Handler Types
export interface RequestHandler {
  (req: ServerRequest, res: ServerResponse): void | Promise<void>;
}

export interface ErrorHandler {
  (error: Error, req: ServerRequest, res: ServerResponse): void | Promise<void>;
}

export interface MiddlewareHandler {
  (req: ServerRequest, res: ServerResponse, next: NextFunction): void | Promise<void>;
}

export type NextFunction = () => Promise<void>;

// Route Types
export interface Route {
  method: HttpMethod;
  path: string;
  handler: RequestHandler;
  middleware?: MiddlewareHandler[];
}

export interface RouterOptions {
  prefix?: string;
  middleware?: MiddlewareHandler[];
}

// Response Types
export interface SendFileOptions {
  maxAge?: number;
  root?: string;
  lastModified?: boolean;
  headers?: Record<string, string>;
  dotfiles?: 'allow' | 'deny' | 'ignore';
}

// Error Types
export class TyrError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TyrError';
  }
}

// Cookie Types
export interface CookieOptions {
  maxAge?: number;
  signed?: boolean;
  expires?: Date;
  httpOnly?: boolean;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
}

// Middleware Types
export interface MiddlewareConfig {
  enabled: boolean;
  options?: unknown;
}

export interface ServerMiddleware {
  name: string;
  handler: MiddlewareHandler;
  config?: MiddlewareConfig;
}

// Common Utility Types
export type Handler = RequestHandler | ErrorHandler | MiddlewareHandler;

export type HttpStatusCode = number;

export interface ParsedUrl {
  protocol?: string;
  hostname?: string;
  pathname?: string;
  search?: string;
  query?: RequestQuery;
  hash?: string;
}

// Type Guards
export function isRequestHandler(handler: Handler): handler is RequestHandler {
  return handler.length === 2;
}

export function isErrorHandler(handler: Handler): handler is ErrorHandler {
  return handler.length === 3 && handler.toString().includes('error');
}

export function isMiddlewareHandler(handler: Handler): handler is MiddlewareHandler {
  return handler.length === 3;
}