# Cross-Domain Resource Loading Fix Documentation

## Problem Overview

The Handbok.org application was experiencing resource loading issues, particularly on subdomains. The following specific problems were observed:

1. **Font loading failures** - 404 errors for .woff2 font files
2. **"Access to storage is not allowed from this context"** errors for localStorage
3. **"ERR_TOO_MANY_REDIRECTS"** errors for CSS, JS and other static resources
4. **Preload warnings** for resources not used within expected timeframes

These issues primarily affected users accessing the site via subdomains (e.g., `customer1.handbok.org`), causing layout problems, authentication failures, and in some cases, completely broken pages.

## Root Causes

1. **Cross-domain resource loading restrictions** - Browsers restrict loading resources from different domains/subdomains for security reasons (CORS)
2. **Storage partitioning** - Modern browsers isolate localStorage between domains/subdomains
3. **Redirect loops** - Next.js routing was creating redirect loops when trying to load static resources
4. **Font loading issues** - Web fonts were failing to load due to CORS restrictions

## Implemented Solutions

### 1. Cross-Domain Storage Script (`cross-domain-storage.js`)

- Created a robust storage system with multiple fallbacks:
  - Direct localStorage access
  - In-memory storage
  - Cookie-based storage
  - Cross-domain bridge via iframe

- Added error detection and automatic fallbacks for handling "Access to storage" errors
- Implemented unified API with consistent access patterns for all storage methods

### 2. Storage Bridge (`storage-bridge.html`)

- Created a dedicated HTML file hosted on the main domain that:
  - Acts as a secure intermediary for localStorage operations
  - Handles cross-domain storage communication
  - Includes error recovery and reporting
  - Provides a fallback system for localStorage

### 3. Auth Bridge (`auth-bridge.html`)

- Implemented a specialized bridge for authentication data:
  - Securely shares auth tokens across subdomains
  - Handles session synchronization
  - Automatically recovers from auth errors
  - Maintains login state across subdomains

### 4. Static Resource Fix (`static-resource-fix.js`)

- Created a comprehensive resource loading fix that:
  - Detects and rewrites resource URLs to point to the main domain
  - Implements progressive enhancement with multiple loading strategies
  - Provides fallback content when resources fail to load
  - Monitors for errors and dynamically adjusts strategies
  - Prevents redirect loops

### 5. API Resource Proxy (`/api/resources`)

- Implemented a server-side proxy for static resources:
  - Fetches resources from the main domain
  - Adds proper CORS headers
  - Caches responses for performance
  - Provides fallback content for critical resources
  - Handles timeout and error scenarios gracefully

### 6. Emergency CSS and JS

- Added inline critical CSS in the main layout file
- Implemented emergency recovery scripts that:
  - Detect redirect loops and stop them
  - Apply minimal styling when resources fail
  - Provide visual indication of emergency mode
  - Ensure basic functionality even when resources fail to load

### 7. Next.js Configuration Updates

- Updated header configurations for proper CORS support
- Implemented rewrite rules to handle subdomain resource requests
- Added specific content-type headers for all resource types
- Set appropriate cache control directives for performance

## Implementation Details

### Cross-Domain Storage Approach

The implemented solution uses a multi-layered approach:

1. **Direct Access** - Try direct localStorage access first
2. **Storage Bridge** - If direct access fails, use the bridge iframe
3. **Cookie Fallback** - For critical auth data, use cookies as another fallback
4. **Memory Storage** - Maintain an in-memory copy as final fallback

This ensures users can authenticate and maintain sessions even with complex browser security restrictions.

### Resource Loading Strategy

The resource loading fix uses a progressive enhancement approach:

1. **Direct URL Strategy** - First try loading from the main domain directly 
2. **Proxy API Strategy** - If direct loading fails, use the API proxy
3. **Inline Content Strategy** - As a final fallback, use emergency inline styles

The system automatically adapts based on what works in the user's browser environment.

### Error Recovery

The implementation includes robust error recovery:

- Redirect loop detection and breaking
- Resource loading failure detection
- Font loading fallbacks
- Emergency styling for critical UI elements
- Automatic strategy downgrading when errors occur

## Testing and Validation

The fixes were validated across:

- Different browsers (Chrome, Firefox, Safari)
- Various security settings
- Multiple subdomains
- With and without cookies enabled
- Private browsing mode

## Maintenance Considerations

For future maintenance:

1. The monitoring scripts report issues to the console for debugging
2. The resource proxy includes detailed logging
3. Each component has version numbers for tracking updates
4. The emergency mode provides visual feedback for support cases

## Best Practices for Future Development

1. Avoid mixing resources across domains when possible
2. Use the unified storage API for all data storage
3. Leverage the resource proxy for any static assets needed across subdomains
4. Include critical CSS inline for fastest rendering
5. Always provide fallbacks for fonts and other optional resources 