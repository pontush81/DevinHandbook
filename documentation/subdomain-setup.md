# Subdomain Functionality for Handbok.org

This document provides information about the subdomain functionality for Handbok.org, which allows accessing handbooks via URLs like `abc.handbok.org`.

## Technical Implementation

The subdomain functionality is implemented using Next.js rewrites in the `next.config.js` file. This approach redirects requests from `subdomain.handbok.org` to the appropriate handbook page without requiring middleware.

### Key Components

1. **Next.js Config**: The `next.config.js` file contains rewrite rules that match subdomain patterns and redirect them to the correct handbook pages.

2. **Handbook Page**: The `/src/app/handbook/[subdomain]/page.tsx` component renders handbook content based on the subdomain parameter.

3. **Handbook Service**: The `handbook-service.ts` file contains functions for retrieving handbooks by subdomain.

## Setting up a New Subdomain

### Prerequisites

1. The DNS configuration for `*.handbok.org` wildcard domain must be set up to point to the Vercel deployment.
2. Vercel must be configured to handle wildcards for the `handbok.org` domain.

### Creating a New Handbook with a Subdomain

You can create a new handbook with a subdomain using one of the following methods:

#### Method 1: Use the create-abc-handbook.js Script

Run the following command:

```bash
node scripts/create-abc-handbook.js
```

This script will create a handbook with the subdomain "abc" and appropriate content.

#### Method 2: Use the Generic create-handbook-local.js Script

Run the following command, replacing "subdomainname" with your desired subdomain:

```bash
node scripts/create-handbook-local.js subdomainname "Handbook Title"
```

#### Method 3: Use the API Endpoint

Send a POST request to the `/api/create-handbook` endpoint with the following payload:

```json
{
  "subdomain": "your-subdomain",
  "name": "Your Handbook Name"
}
```

Include the Authorization header with the secret key:

```
Authorization: Bearer handbok-secret-key
```

Example using curl:

```bash
curl -X POST https://handbok.org/api/create-handbook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer handbok-secret-key" \
  -d '{"subdomain": "your-subdomain", "name": "Your Handbook Name"}'
```

## Testing Subdomain Functionality

### Local Testing

1. Add the subdomain to your local hosts file:
   ```
   127.0.0.1   abc.handbok.org
   ```

2. Run the Next.js development server:
   ```bash
   npm run dev
   ```

3. Access the subdomain in your browser: `http://abc.handbok.org:3000`

### Production Testing

After deploying to Vercel:

1. Create a handbook with the desired subdomain using one of the methods above.
2. Access the handbook via `https://subdomain.handbok.org`

You can use the test-subdomain.js script to diagnose issues:

```bash
node scripts/test-subdomain.js your-subdomain
```

## Troubleshooting

### 404 Errors on Subdomain Access

If you receive 404 errors when accessing a subdomain:

1. Verify that the handbook exists in the database with the correct subdomain.
2. Check that the DNS configuration is correct.
3. Ensure that Vercel is configured to handle wildcards for the domain.
4. Check the Next.js configuration in `next.config.js`.

### Database Connection Issues

If you have trouble connecting to the database:

1. Verify that your environment variables are correct.
2. Check network connectivity to the Supabase instance.
3. Try using an API endpoint instead of direct database access.

## DNS Configuration for Wildcard Domains

To set up a wildcard subdomain for `*.handbok.org`:

1. Access your DNS provider's dashboard.
2. Add an A record:
   - Host: `*` (or `*.handbok.org` depending on your provider)
   - Value: The IP address of your Vercel deployment
3. Add a CNAME record:
   - Host: `*` (or `*.handbok.org`)
   - Value: `cname.vercel-dns.com.` (with the trailing dot)

## Vercel Configuration

1. In your Vercel project settings, go to the "Domains" section.
2. Add `handbok.org` as a domain.
3. Add `*.handbok.org` as a wildcard domain.
4. Verify the DNS configuration.

## References

- [Next.js Rewrites Documentation](https://nextjs.org/docs/api-reference/next.config.js/rewrites)
- [Vercel Wildcard Domains](https://vercel.com/docs/projects/domains/add-a-domain#wildcard-domains) 