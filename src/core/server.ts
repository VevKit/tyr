import { createServer, IncomingMessage, ServerResponse as NodeServerResponse } from 'node:http';
import type { ServerConfig, BodyParserOptions, Route, HttpMethod, ErrorHandler, RequestHandler, MiddlewareHandler } from './types';
import { ServerRequest } from './request';
import { ServerResponse } from './response';
import { NotFoundError, TyrError } from './errors';
import { Router } from './router';
import { MiddlewareChain } from './middleware';
import { registry as parserRegistry } from '../middleware/body-parser';
import { 
  JsonParser, 
  UrlEncodedParser, 
  TextParser, 
  RawParser, 
  MultipartParser 
} from '../middleware/body-parser';
import { parseBytes } from '@/utils/parseBytes';

export class Server {
  private httpServer = createServer((req, res) => this.handleRequest(req, res));
  private router = new Router();
  private routes = new Map<string, Map<HttpMethod, Route>>();
  private errorHandlers: ErrorHandler[] = [];
  private globalMiddleware = new MiddlewareChain();
  private routeMiddleware = new Map<string, MiddlewareChain>();

  constructor(private config: ServerConfig = {}) {
    this.config = {
      port: config.port ?? 3000,
      host: config.host ?? 'localhost',
      bodyParser: config.bodyParser ?? true,
      timeout: config.timeout ?? 30000,
      ...config
    };

    // Set default error handler
    this.onError(this.defaultErrorHandler.bind(this));

    // Configure body parsers based on config
    this.configureBodyParsers(this.config.bodyParser);
  }

  private configureBodyParsers(config: boolean | BodyParserOptions = true): void {
    parserRegistry.clear();

    if (config === false) {
      return;
    }

    // Default parser options with numeric limits
    const defaultOptions = {
      json: { limit: parseBytes('1mb') },
      urlencoded: { limit: parseBytes('1mb'), extended: true },
      raw: { limit: parseBytes('1mb') },
      text: { limit: parseBytes('1mb') },
      multipart: { 
        maxFileSize: parseBytes('10mb'),
        maxFields: 1000
      }
    };

    const options = config === true ? defaultOptions : {
      ...defaultOptions,
      ...(typeof config === 'object' ? this.normalizeParserOptions(config) : {})
    };

    // Register parsers based on configuration
    if (options.json) {
      parserRegistry.registerParser(
        new JsonParser(typeof options.json === 'boolean' ? {} : options.json)
      );
    }

    if (options.urlencoded) {
      parserRegistry.registerParser(
        new UrlEncodedParser(typeof options.urlencoded === 'boolean' ? {} : options.urlencoded)
      );
    }

    if (options.raw) {
      parserRegistry.registerParser(
        new RawParser(typeof options.raw === 'boolean' ? {} : options.raw)
      );
    }

    if (options.text) {
      parserRegistry.registerParser(
        new TextParser(typeof options.text === 'boolean' ? {} : options.text)
      );
    }

    if (options.multipart) {
      parserRegistry.registerParser(
        new MultipartParser(typeof options.multipart === 'boolean' ? {} : options.multipart)
      );
    }
  }

  private normalizeParserOptions(config: BodyParserOptions) {
    const normalized: Record<string, any> = {};

    if (config.json) {
      normalized.json = typeof config.json === 'boolean' ? {} : {
        ...config.json,
        limit: typeof config.json.limit === 'string' ? parseBytes(config.json.limit) : config.json.limit
      };
    }

    if (config.urlencoded) {
      normalized.urlencoded = typeof config.urlencoded === 'boolean' ? {} : {
        ...config.urlencoded,
        limit: typeof config.urlencoded.limit === 'string' ? parseBytes(config.urlencoded.limit) : config.urlencoded.limit
      };
    }

    if (config.raw) {
      normalized.raw = typeof config.raw === 'boolean' ? {} : {
        ...config.raw,
        limit: typeof config.raw.limit === 'string' ? parseBytes(config.raw.limit) : config.raw.limit
      };
    }

    if (config.text) {
      normalized.text = typeof config.text === 'boolean' ? {} : {
        ...config.text,
        limit: typeof config.text.limit === 'string' ? parseBytes(config.text.limit) : config.text.limit
      };
    }

    if (config.multipart) {
      normalized.multipart = typeof config.multipart === 'boolean' ? {} : {
        ...config.multipart,
        maxFileSize: typeof config.multipart.maxFileSize === 'string' ? 
          parseBytes(config.multipart.maxFileSize) : config.multipart.maxFileSize,
        maxFieldSize: typeof config.multipart.maxFieldSize === 'string' ? 
          parseBytes(config.multipart.maxFieldSize) : config.multipart.maxFieldSize
      };
    }

    return normalized;
  }

  // Add global middleware
  public use(handler: MiddlewareHandler): this {
    this.globalMiddleware.use(handler);
    return this;
  }

  // Add route-specific middleware
  public useRoute(path: string, handler: MiddlewareHandler): this {
    const chain = this.routeMiddleware.get(path) ?? new MiddlewareChain();
    chain.use(handler);
    this.routeMiddleware.set(path, chain);
    return this;
  }

  // Public API Methods
  public get(path: string, handler: RequestHandler): this {
    this.router.addRoute('GET', this.normalizePath(path), handler);
    return this;
  }

  public post(path: string, handler: RequestHandler): this {
    this.router.addRoute('POST', this.normalizePath(path), handler);
    return this;
  }

  public put(path: string, handler: RequestHandler): this {
    return this.addRoute('PUT', path, handler);
  }

  public delete(path: string, handler: RequestHandler): this {
    return this.addRoute('DELETE', path, handler);
  }

  public patch(path: string, handler: RequestHandler): this {
    return this.addRoute('PATCH', path, handler);
  }

  public onError(handler: ErrorHandler): this {
    this.errorHandlers.push(handler);
    return this;
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      // Set server timeout
      this.httpServer.timeout = this.config.timeout ?? 30000;

      // Start listening
      this.httpServer.listen(this.config.port, this.config.host, () => {
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Private Methods
  private addRoute(method: HttpMethod, path: string, handler: RequestHandler): this {
    // Normalize path
    const normalizedPath = this.normalizePath(path);

    // Get or create route map for this path
    const routeMethods = this.routes.get(normalizedPath) ?? new Map();
    
    // Add the route with its handler
    routeMethods.set(method, {
      method,
      path: normalizedPath,
      handler
    });

    // Store updated routes
    this.routes.set(normalizedPath, routeMethods);

    return this;
  }

  private async handleRequest(rawReq: IncomingMessage, rawRes: NodeServerResponse): Promise<void> {
    const req = await this.createRequest(rawReq);
    const res = this.createResponse(rawRes);
  
    try {
      // Execute global middleware first
      await this.globalMiddleware.execute(req, res);
      
      if (res.sent) return; // Stop if middleware sent response

      // Find matching route
      const result = this.router.findRoute(
        req.method as HttpMethod,
        req.path
      );

      if (!result) {
        throw new NotFoundError(`No route found for ${req.method} ${req.path}`);
      }

      // Add params to request
      req.params = result.params;

      // Execute route-specific middleware
      const routeChain = this.routeMiddleware.get(result.route.path);
      if (routeChain) {
        await routeChain.execute(req, res);
        if (res.sent) return;
      }

      // Execute route handler
      await result.route.handler(req, res);

      if (!res.sent) {
        throw new TyrError('No response sent by handler');
      }
    } catch (error) {
      await this.handleError(error, req, res);
    }
  }

  private async executeMiddlewareChain(
    chain: (MiddlewareHandler | RequestHandler)[],
    req: ServerRequest,
    res: ServerResponse
  ): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      // Get next handler in chain
      const handler = chain[index++];
      if (handler) {
        await handler(req, res, next);
      }
    };

    // Start chain execution
    await next();
  }

  private findRoute(method: HttpMethod, path: string): Route | undefined {
    const normalizedPath = this.normalizePath(path);
    const routeMethods = this.routes.get(normalizedPath);
    return routeMethods?.get(method);
  }

  private async handleError(error: unknown, req: ServerRequest, res: ServerResponse): Promise<void> {
    const tyrError = this.normalizeError(error);

    // Try each error handler
    for (const handler of this.errorHandlers) {
      try {
        await handler(tyrError, req, res);
        if (res.sent) return;
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError);
      }
    }

    // If no handler succeeded, use default response
    if (!res.sent) {
      await this.defaultErrorHandler(tyrError, req, res);
    }
  }

  private async defaultErrorHandler(error: TyrError, _req: ServerRequest, res: ServerResponse): Promise<void> {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: {
        message: error.message,
        statusCode,
        ...(error.details ? { details: error.details } : {})
      }
    });
  }

  private normalizeError(error: unknown): TyrError {
    if (error instanceof TyrError) {
      return error;
    }

    if (error instanceof Error) {
      return new TyrError(error.message);
    }

    return new TyrError('Internal Server Error');
  }

  private normalizePath(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  }

  private async createRequest(raw: IncomingMessage): Promise<ServerRequest> {
    return new ServerRequest(raw);
  }

  private createResponse(raw: NodeServerResponse): ServerResponse {
    return new ServerResponse(raw);
  }
}