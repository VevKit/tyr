# @vevkit/tyr

A lightweight, type-safe HTTP server with clean interfaces and zero configuration required.

## Installation

```bash
npm install @vevkit/tyr
```

## Quick Start

```typescript
import { Server } from '@vevkit/tyr';

const server = new Server();

server.get('/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

await server.start();
```

## Basic Usage

### Creating a Server

```typescript
// Default configuration (port 3000)
const server = new Server();

// Custom configuration
const server = new Server({
  port: 8080,
  host: 'localhost',
  timeout: 30000  // 30 seconds
});
```

### Routing

```typescript
// Basic routes
server.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'John' }]);
});

server.post('/users', async (req, res) => {
  const user = await req.getBody<{ name: string }>();
  res.status(201).json({ id: 2, name: user.name });
});

// URL Parameters
server.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ id: userId, name: 'John' });
});

// Query Parameters
server.get('/search', (req, res) => {
  const query = req.query.q;
  res.json({ query });
});
```

### Response Methods

```typescript
// JSON Response
server.get('/json', (req, res) => {
  res.json({ hello: 'world' });
});

// Text Response
server.get('/text', (req, res) => {
  res.send('Hello, World!');
});

// Status Codes
server.get('/notfound', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Redirect
server.get('/redirect', (req, res) => {
  res.redirect('/new-location');
});
```

### Request Body Handling

The server automatically handles different content types:

```typescript
// JSON Data
server.post('/api/json', async (req, res) => {
  const data = await req.getBody<{ name: string }>();
  res.json({ message: `Hello, ${data.name}!` });
});

// URL-encoded Form Data
server.post('/api/form', async (req, res) => {
  const formData = await req.getBody<Record<string, string>>();
  res.json(formData);
});

// File Uploads
server.post('/api/upload', async (req, res) => {
  const { fields, files } = await req.getBody<{
    fields: MultipartField[],
    files: MultipartFile[]
  }>();

  res.json({
    message: 'Upload successful',
    fields,
    files: files.map(f => ({
      name: f.originalname,
      size: f.size
    }))
  });
});
```

### Error Handling

```typescript
// Global error handler
server.onError((error, req, res) => {
  console.error('Error:', error);
  res.status(500).json({
    error: error.message
  });
});

// Route-specific error handling
server.get('/might-fail', async (req, res) => {
  try {
    // ... some operation
    throw new Error('Something went wrong');
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

### Middleware

```typescript
// Global middleware
server.use(async (req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  await next();
});

// Route-specific middleware
const authenticate = async (req: ServerRequest, res: ServerResponse, next: NextFunction) => {
  const token = req.headers['authorization'];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  await next();
};

server.get('/protected',
  authenticate,
  (req, res) => {
    res.json({ secret: 'data' });
  }
);
```

### Security Headers

```typescript
server.use(securityHeaders());

// Custom configuration
server.use(securityHeaders({
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  csp: {
    enabled: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://api.example.com']
    }
  },
  // Disable features you don't need
  xssFilter: {
    enabled: false
  }
}));
```

## Advanced Configuration

### Body Parser Options

```typescript
const server = new Server({
  bodyParser: {
    json: {
      limit: '2mb'
    },
    urlencoded: {
      limit: '1mb',
      extended: true
    },
    multipart: {
      maxFileSize: '10mb',
      maxFields: 1000,
      preserveExtension: true
    }
  }
});
```

### Disable Body Parsing

```typescript
const server = new Server({
  bodyParser: false
});
```

## Type Safety

TypeScript types are available for all APIs:

```typescript
import type { 
  ServerRequest, 
  ServerResponse, 
  NextFunction,
  MultipartFile,
  MultipartField 
} from '@vevkit/tyr';

interface User {
  id: number;
  name: string;
}

server.post('/users', async (req: ServerRequest, res: ServerResponse) => {
  const user = await req.getBody<User>();
  // TypeScript knows user has id and name properties
  res.json(user);
});
```

## Server Lifecycle

```typescript
const server = new Server();

// Start the server
await server.start();

// Stop the server
await server.stop();
```

## Error Codes

Common HTTP errors are available as classes:

```typescript
import { BadRequestError, NotFoundError, UnauthorizedError } from '@vevkit/tyr';

server.get('/protected', (req, res) => {
  throw new UnauthorizedError('Invalid token');
});

server.get('/resource/:id', (req, res) => {
  throw new NotFoundError(`Resource ${req.params.id} not found`);
});
```

## Examples

### Basic API Server

```typescript
import { Server } from '@vevkit/tyr';

const server = new Server({ port: 3000 });

// Logging middleware
server.use(async (req, res, next) => {
  const start = Date.now();
  await next();
  console.log(`${req.method} ${req.path} - ${Date.now() - start}ms`);
});

// Routes
server.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' }
  ]);
});

server.post('/api/users', async (req, res) => {
  const user = await req.getBody<{ name: string }>();
  res.status(201).json({
    id: 3,
    name: user.name
  });
});

// Error handling
server.onError((error, req, res) => {
  res.status(error.statusCode || 500).json({
    error: error.message
  });
});

await server.start();
console.log('Server running on http://localhost:3000');
```

### File Upload Server

```typescript
import { Server } from '@vevkit/tyr';

const server = new Server({
  bodyParser: {
    multipart: {
      maxFileSize: '20mb',
      preserveExtension: true
    }
  }
});

server.post('/upload', async (req, res) => {
  const { fields, files } = await req.getBody<{
    fields: MultipartField[],
    files: MultipartFile[]
  }>();

  // Process the files
  const results = files.map(file => ({
    originalName: file.originalname,
    size: file.size,
    type: file.mimetype
  }));

  res.json({
    message: 'Upload successful',
    files: results,
    fields
  });
});

await server.start();
```

## License

MIT