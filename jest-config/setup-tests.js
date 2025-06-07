// Global setup for Next.js API route testing

// Setup environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.RESEND_DOMAIN = 'test.com';
process.env.SUPABASE_WEBHOOK_SECRET = 'test-webhook-secret';

// Mock Request and Response objects for Jest
class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Map(Object.entries(options.headers || {}));
    this.body = options.body;
  }

  json() {
    return Promise.resolve(JSON.parse(this.body || '{}'));
  }
}

class MockResponse {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.headers = new Map(Object.entries(options.headers || {}));
    this.ok = this.status >= 200 && this.status < 300;
  }

  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body);
  }

  text() {
    return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body));
  }
}

class MockHeaders extends Map {
  get(name) {
    return super.get(name.toLowerCase());
  }

  set(name, value) {
    return super.set(name.toLowerCase(), value);
  }

  has(name) {
    return super.has(name.toLowerCase());
  }

  delete(name) {
    return super.delete(name.toLowerCase());
  }
}

// Mock NextResponse for Next.js API routes
class MockNextResponse extends MockResponse {
  static json(body, options = {}) {
    return new MockNextResponse(body, options);
  }
}

// Set up global objects
global.Request = MockRequest;
global.Response = MockResponse;
global.Headers = MockHeaders;

// Mock Next.js specific objects
global.NextResponse = MockNextResponse;

// Mock fetch if needed
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Add any other global setup needed for tests 