import { HttpMethod, Route, RequestHandler } from './types';

interface RoutePattern {
  pattern: RegExp;
  paramNames: string[];
}

export class Router {
  private routes = new Map<string, Map<HttpMethod, Route>>();
  private patterns = new Map<string, RoutePattern>();

  // Add a route with support for path parameters
  public addRoute(method: HttpMethod, path: string, handler: RequestHandler): void {
    // Convert path to pattern and store parameter names
    const { pattern, paramNames } = this.createRoutePattern(path);
    
    // Store the pattern for later use
    this.patterns.set(path, { pattern, paramNames });

    // Get or create route map for this path
    const routeMethods = this.routes.get(path) ?? new Map();
    
    // Add the route
    routeMethods.set(method, {
      method,
      path,
      handler,
      pattern,
      paramNames
    });

    // Store updated routes
    this.routes.set(path, routeMethods);
  }

  // Find a matching route for a given path and method
  public findRoute(method: HttpMethod, path: string): { 
    route: Route; 
    params: Record<string, string>;
  } | undefined {
    // Check each route's pattern for a match
    for (const [routePath, routeMethods] of this.routes) {
      const routePattern = this.patterns.get(routePath);
      if (!routePattern) continue;

      const match = path.match(routePattern.pattern);
      if (!match) continue;

      const route = routeMethods.get(method);
      if (!route) continue;

      // Extract parameters from match
      const params: Record<string, string> = {};
      routePattern.paramNames.forEach((name, index) => {
        params[name] = match[index + 1] || '';
      });

      return { route, params };
    }

    return undefined;
  }

  private createRoutePattern(path: string): RoutePattern {
    const paramNames: string[] = [];
    
    // Convert path to regex pattern
    const pattern = path
      .replace(/\/:([^/]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '/([^/]+)';
      })
      .replace(/\*/g, '.*');

    // Create the RegExp object
    const regexPattern = new RegExp(`^${pattern}$`);

    return {
      pattern: regexPattern,
      paramNames
    };
  }
}