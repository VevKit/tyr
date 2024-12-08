import { ServerResponse as NodeServerResponse } from 'node:http';

export class ServerResponse {
  private sent = false;
  private headers: Record<string, string | number | string[]> = {};

  constructor(private raw: NodeServerResponse) {
    // Set sensible defaults
    this.header('Content-Type', 'application/json');
  }

  // Status code setting with chainable API
  public status(code: number): this {
    this.raw.statusCode = code;
    return this;
  }

  // Header setting with chainable API
  public header(name: string, value: string | number | string[]): this {
    this.checkSent();
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  // Send JSON response
  public json(data: unknown): void {
    this.checkSent();
    this.header('Content-Type', 'application/json');
    this.raw.end(JSON.stringify(data));
    this.sent = true;
  }

  // Send plain text response
  public send(data: string): void {
    this.checkSent();
    this.header('Content-Type', 'text/plain');
    this.raw.end(data);
    this.sent = true;
  }

  // Redirect to another URL
  public redirect(url: string, code: number = 302): void {
    this.checkSent();
    this.header('Location', url);
    this.status(code);
    this.raw.end();
    this.sent = true;
  }

  // Send a file (basic implementation)
  public sendFile(path: string, options?: SendFileOptions): Promise<void> {
    this.checkSent();
    // Implementation of file sending logic
    // This would include proper content-type setting and streaming
    return Promise.resolve();
  }

  private checkSent(): void {
    if (this.sent) {
      throw new Error('Response has already been sent');
    }
  }

  // Apply all headers before sending
  private applyHeaders(): void {
    Object.entries(this.headers).forEach(([name, value]) => {
      this.raw.setHeader(name, value);
    });
  }
}