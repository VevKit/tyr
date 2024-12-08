// src/core/types.ts
export interface ServerConfig {
  port?: number;
  host?: string;
  bodyParser?: boolean | BodyParserOptions;
}

export interface RequestHandler {
  (req: ServerRequest, res: ServerResponse): void | Promise<void>;
}

export interface ErrorHandler {
  (error: Error, req: ServerRequest, res: ServerResponse): void | Promise<void>;
}