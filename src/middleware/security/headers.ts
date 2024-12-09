// src/middleware/security/headers.ts

import type { ServerRequest } from '../../core/request';
import type { ServerResponse } from '../../core/response';
import type { MiddlewareHandler } from '../../core/types';

export interface SecurityHeadersOptions {
  /** HTTP Strict Transport Security */
  hsts?: {
    enabled?: boolean;
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  
  /** Content Security Policy */
  csp?: {
    enabled?: boolean;
    directives?: Record<string, string | string[]>;
    reportOnly?: boolean;
  };
  
  /** X-Frame-Options */
  frameOptions?: {
    enabled?: boolean;
    action?: 'DENY' | 'SAMEORIGIN';
  };
  
  /** X-Content-Type-Options */
  noSniff?: boolean;
  
  /** X-XSS-Protection */
  xssFilter?: {
    enabled?: boolean;
    mode?: 'block';
  };
  
  /** Referrer-Policy */
  referrerPolicy?: {
    enabled?: boolean;
    policy?: string | string[];
  };
  
  /** Permissions Policy */
  permissionsPolicy?: {
    enabled?: boolean;
    directives?: Record<string, string | string[]>;
  };

  /** Cross-Origin-Opener-Policy */
  coep?: {
    enabled?: boolean;
    policy?: 'unsafe-none' | 'same-origin-allow-popups' | 'same-origin' | 'require-corp';
  };

  /** Cross-Origin-Embedder-Policy */
  coop?: {
    enabled?: boolean;
    policy?: 'unsafe-none' | 'require-corp' | 'same-origin-allow-popups' | 'same-origin';
  };
}

const DEFAULT_OPTIONS: SecurityHeadersOptions = {
  hsts: {
    enabled: true,
    maxAge: 15552000, // 180 days
    includeSubDomains: true,
    preload: false
  },
  csp: {
    enabled: true,
    directives: {
      'default-src': ["'self'"],
      'base-uri': ["'self'"],
      'font-src': ["'self'", 'https:', 'data:'],
      'form-action': ["'self'"],
      'frame-ancestors': ["'self'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'object-src': ["'none'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", 'https:', "'unsafe-inline'"]
    }
  },
  frameOptions: {
    enabled: true,
    action: 'DENY'
  },
  noSniff: true,
  xssFilter: {
    enabled: true,
    mode: 'block'
  },
  referrerPolicy: {
    enabled: true,
    policy: 'strict-origin-when-cross-origin'
  },
  permissionsPolicy: {
    enabled: true,
    directives: {
      'camera': ['()'],
      'microphone': ['()'],
      'geolocation': ['()']
    }
  },
  coep: {
    enabled: true,
    policy: 'require-corp'
  },
  coop: {
    enabled: true,
    policy: 'same-origin'
  }
};

export const securityHeaders = (options: SecurityHeadersOptions = {}): MiddlewareHandler => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return async (req: ServerRequest, res: ServerResponse, next: () => Promise<void>) => {
    // HSTS
    if (config.hsts?.enabled) {
      let hstsValue = `max-age=${config.hsts.maxAge}`;
      if (config.hsts.includeSubDomains) hstsValue += '; includeSubDomains';
      if (config.hsts.preload) hstsValue += '; preload';
      res.header('Strict-Transport-Security', hstsValue);
    }

    // CSP
    if (config.csp?.enabled) {
      const cspDirectives = Object.entries(config.csp.directives || {})
        .map(([key, value]) => {
          const directive = Array.isArray(value) ? value.join(' ') : value;
          return `${key} ${directive}`;
        })
        .join('; ');

      const headerName = config.csp.reportOnly ? 
        'Content-Security-Policy-Report-Only' : 
        'Content-Security-Policy';
      
      res.header(headerName, cspDirectives);
    }

    // X-Frame-Options
    if (config.frameOptions?.enabled) {
      res.header('X-Frame-Options', config.frameOptions.action ?? 'DENY');
    }

    // X-Content-Type-Options
    if (config.noSniff) {
      res.header('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection
    if (config.xssFilter?.enabled) {
      res.header('X-XSS-Protection', config.xssFilter.mode ? '1; mode=block' : '1');
    }

    // Referrer-Policy
    if (config.referrerPolicy?.enabled) {
      const policy = Array.isArray(config.referrerPolicy.policy) 
        ? config.referrerPolicy.policy.join(',')
        : config.referrerPolicy.policy;
      res.header('Referrer-Policy', policy ?? 'strict-origin-when-cross-origin');
    }

    // Permissions-Policy
    if (config.permissionsPolicy?.enabled) {
      const policy = Object.entries(config.permissionsPolicy.directives || {})
        .map(([feature, value]) => {
          const directive = Array.isArray(value) ? value.join(' ') : value;
          return `${feature}=${directive}`;
        })
        .join(', ');
      res.header('Permissions-Policy', policy);
    }

    // Cross-Origin-Embedder-Policy
    if (config.coep?.enabled) {
      res.header('Cross-Origin-Embedder-Policy', config.coep.policy ?? 'require-corp');
    }

    // Cross-Origin-Opener-Policy
    if (config.coop?.enabled) {
      res.header('Cross-Origin-Opener-Policy', config.coop.policy ?? 'same-origin');
    }

    await next();
  };
};