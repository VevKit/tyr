// src/core/types.ts
import { TyrError } from './errors';
import { ServerRequest } from './request';
import { ServerResponse } from './response';
import type { 
  JsonParserOptions, 
  UrlEncodedParserOptions, 
  RawParserOptions, 
  TextParserOptions,
  MultipartParserOptions 
} from '../middleware/body-parser/types';

// Server Configuration
export interface ServerConfig {
  port?: number;
  host?: string;
  bodyParser?: boolean | BodyParserOptions;
  trustProxy?: boolean;
  timeout?: number;
}

// Body Parser Options for Server Config
export interface BodyParserOptions {
  json?: boolean | JsonParserOptions;
  urlencoded?: boolean | UrlEncodedParserOptions;
  raw?: boolean | RawParserOptions;
  text?: boolean | TextParserOptions;
  multipart?: boolean | MultipartParserOptions;
}

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
  (error: TyrError, req: ServerRequest, res: ServerResponse): void | Promise<void>;
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


export interface CorsOptions {
  // Configures the Access-Control-Allow-Origin CORS header
  origin?: string | boolean;
  
  // Configures the Access-Control-Allow-Methods CORS header
  methods?: string | string[];
  
  // Configures the Access-Control-Allow-Headers CORS header
  headers?: string | string[];
  
  // Configures the Access-Control-Allow-Credentials CORS header
  credentials?: boolean;
  
  // Configures the Access-Control-Expose-Headers CORS header
  exposeHeaders?: string | string[];
  
  // Configures the Access-Control-Max-Age CORS header
  maxAge?: number;
  
  // Enable or disable CORS preflight
  preflightContinue?: boolean;
  
  // Provides a status code to use for successful OPTIONS requests
  optionsSuccessStatus?: number;
}

// Helper type for normalizing CORS values
export type NormalizedCorsOptions = {
  origin: string | boolean;
  methods: string;
  headers: string;
  credentials: boolean;
  exposeHeaders: string;
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
};

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
