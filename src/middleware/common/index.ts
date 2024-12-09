import { ServerRequest } from "@/core/request";
import { ServerResponse } from "@/core/response";
import { CorsOptions, MiddlewareHandler, NextFunction, NormalizedCorsOptions } from "@/core/types";

export const json: MiddlewareHandler = async (req: ServerRequest, _res: ServerResponse, next: NextFunction) => {
  if (req.headers['content-type']?.includes('application/json')) {
    req.body = await req.getBody<unknown>();
  }
  await next();
};

export const urlencoded: MiddlewareHandler = async (req, _res, next) => {
  if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
    req.body = await req.getBody<Record<string, string>>();
  }
  await next();
};


export const cors = (options: CorsOptions = {}): MiddlewareHandler => {
  const defaultOptions: NormalizedCorsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    headers: 'Content-Type,Authorization',
    credentials: false,
    exposeHeaders: '',
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  // Merge provided options with defaults
  const normalizedOptions: NormalizedCorsOptions = {
    ...defaultOptions,
    ...options,
    // Convert arrays to strings if necessary
    methods: Array.isArray(options.methods) ? options.methods.join(',') : options.methods ?? defaultOptions.methods,
    headers: Array.isArray(options.headers) ? options.headers.join(',') : options.headers ?? defaultOptions.headers,
    exposeHeaders: Array.isArray(options.exposeHeaders) ? options.exposeHeaders.join(',') : options.exposeHeaders ?? defaultOptions.exposeHeaders
  };

  return async (req, res, next) => {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', normalizedOptions.origin.toString());
    
    if (normalizedOptions.credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (req.method === 'OPTIONS') {
      // Preflight request
      res.header('Access-Control-Allow-Methods', normalizedOptions.methods);
      res.header('Access-Control-Allow-Headers', normalizedOptions.headers);
      
      if (normalizedOptions.maxAge) {
        res.header('Access-Control-Max-Age', normalizedOptions.maxAge.toString());
      }
      
      if (normalizedOptions.exposeHeaders) {
        res.header('Access-Control-Expose-Headers', normalizedOptions.exposeHeaders);
      }

      if (!normalizedOptions.preflightContinue) {
        res.status(normalizedOptions.optionsSuccessStatus).send('');
        return;
      }
    }

    await next();
  };
};