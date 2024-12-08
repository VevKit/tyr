// src/core/server.ts
export class Server {
  private config: ServerConfig;
  private errorHandlers: ErrorHandler[] = [];
  private routes: Map<string, Map<HttpMethod, RequestHandler>>;
  
  constructor(config: ServerConfig = {}) {
    this.config = {
      port: config.port ?? 3000,
      host: config.host ?? 'localhost',
      bodyParser: config.bodyParser ?? true
    };
    this.routes = new Map();
  }
  
  public get(path: string, handler: RequestHandler): this {
    return this.addRoute('GET', path, handler);
  }
  
  public post(path: string, handler: RequestHandler): this {
    return this.addRoute('POST', path, handler);
  }
  
  public onError(handler: ErrorHandler): this {
    this.errorHandlers.push(handler);
    return this;
  }
  
  private addRoute(method: HttpMethod, path: string, handler: RequestHandler): this {
    const routeMethods = this.routes.get(path) ?? new Map();
    routeMethods.set(method, handler);
    this.routes.set(path, routeMethods);
    return this;
  }
  
  public async start(): Promise<void> {
    // Implementation coming in next step
  }
}