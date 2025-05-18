# Subdomain Configuration for Handbok.org

This document outlines the necessary steps to configure and use subdomains (like `abc.handbok.org`) for the Handbok application.

## Overview

The subdomain functionality allows different handbooks to be accessed through unique subdomains like:
- `abc.handbok.org`
- `company-name.handbok.org`
- `your-handbook.handbok.org`

This is implemented without middleware, using Next.js rewrites in the `next.config.js` file.

## DNS Configuration

### Production Environment

1. **Wildcard DNS Record**:
   - Add a `CNAME` record for `*.handbok.org` that points to your Vercel deployment URL
   - In most DNS providers, this looks like:
     ```
     Type: CNAME
     Name: *
     Value: cname.vercel-dns.com.
     TTL: 3600 (or Auto)
     ```

2. **Root Domain**:
   - Ensure your root domain `handbok.org` is properly configured to point to your Vercel deployment

### Local Development Environment

For local testing, add entries to your hosts file:

**Mac/Linux**:
```
127.0.0.1    handbok.org
127.0.0.1    www.handbok.org
127.0.0.1    abc.handbok.org
127.0.0.1    test.handbok.org
# Add other test subdomains as needed
```

**Windows**:
```
127.0.0.1    handbok.org
127.0.0.1    www.handbok.org
127.0.0.1    abc.handbok.org
127.0.0.1    test.handbok.org
# Add other test subdomains as needed
```

Location:
- Mac/Linux: `/etc/hosts`
- Windows: `C:\Windows\System32\drivers\etc\hosts`

## Vercel Configuration

### Domains Setup

1. Go to the Vercel dashboard for your project
2. Navigate to "Settings" > "Domains"
3. Add the following domains:
   - `handbok.org`
   - `www.handbok.org`
   - `*.handbok.org` (this wildcard domain is crucial for subdomain functionality)

### Environment Variables

Ensure these environment variables are set in your Vercel deployment:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

## Creating a Handbook with a Subdomain

### Using the API Directly

To create the `abc` handbook directly through the API, use:

```
curl https://handbok.org/api/create-abc-direct
```

### Using the Creation Script

Run this command in your project directory:

```
node scripts/create-abc-handbook.js
```

### Creating Custom Handbooks

1. Use the web interface at `https://handbok.org/create-handbook` to create a new handbook
2. Specify your desired subdomain during creation
3. Once created, access it via `https://your-subdomain.handbok.org`

## How Subdomains Work in this Application

1. **Request Processing**: When a request comes to `subdomain.handbok.org`:
   - Next.js processes the request through rewrites defined in `next.config.js`
   - The request is directed to the handbook creation page
   - Static resources are served from the main domain

2. **Resource Handling**: 
   - All static resources (`_next/static/*`, CSS, JS, images) are served from the main domain
   - Special headers ensure proper CORS configuration
   - API routes work through both the main domain and subdomains

## Troubleshooting

### Missing Static Resources (CSS/JS)

If the subdomain site loads without styles or JS:
1. Ensure all `/_next/*` paths are properly rewritten in `next.config.js`
2. Check that CORS headers are correctly configured
3. Verify your DNS settings are propagated (this can take up to 48 hours)

### Database Connection Issues

If you're having trouble connecting to the database from local environment:
1. Run the diagnostic script:
   ```
   node scripts/diagnose-db-connection.js
   ```
2. Check if Supabase is blocking connections from your IP address
3. Try creating the handbook directly in production:
   ```
   curl https://handbok.org/api/create-abc-direct
   ```

### Testing a Subdomain

To test if a subdomain is properly configured:
```
node scripts/test-subdomain.js abc
```

### 404 Errors

If you're getting 404 errors on your subdomain:
1. Make sure the handbook exists in the database
2. Verify the subdomain is correctly set up in DNS
3. Check the Vercel logs for any routing issues

## Security Considerations

- The subdomain system is designed to only work with published handbooks
- Row Level Security in Supabase ensures data integrity
- All API endpoints include proper authentication checks

## Current Limitations

- Each subdomain must be unique
- Subdomains cannot include special characters (only letters, numbers, and hyphens)
- Subdomain length must be between 3 and 63 characters 