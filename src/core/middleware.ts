import type { ServerRequest } from './request';
import type { ServerResponse } from './response';
import type { NextFunction, MiddlewareHandler } from './types';

export class MiddlewareChain {
  private middleware: MiddlewareHandler[] = [];

  // Add middleware to the chain
  public use(handler: MiddlewareHandler): this {
    this.middleware.push(handler);
    return this;
  }

  // Execute the middleware chain
  public async execute(req: ServerRequest, res: ServerResponse): Promise<void> {
    let index = 0;

    const next: NextFunction = async (): Promise<void> => {
      // Get next middleware in chain
      const handler = this.middleware[index++];
      
      if (handler) {
        // Execute middleware with next function
        await handler(req, res, next);
      }
    };

    // Start the chain
    await next();
  }
}