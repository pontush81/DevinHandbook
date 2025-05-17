This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Rebuild Trigger
Triggering a new build to production: 2023-07-16

## Handboksvisare

För att undvika problem med subdomänhantering i Next.js med Middle, App Router och dynamisk routing har vi implementerat en förenklad handboksvisare som använder query parameters istället för dynamiska routes.

### Använda handboksvisaren

Du kan komma åt handboksvisaren via:

```
https://handbok.org/view?company=företagsnamn
```

där `företagsnamn` är subdomänen för den handbok du vill visa.

### Teknisk lösning

Vi har medvetet undvikit:
- Dynamiska routes med `[subdomain]`
- Middleware för subdomän-redirects
- Client-side redirects

Detta ger en mer stabil och felsäker lösning utan redirect-loopar.

## Routing Structure

### Simplified Routing

We've moved away from subdomain-based routing to a simpler query parameter approach to avoid redirect issues:

- **Old approach (disabled)**: `company.handbok.org`
- **New approach (recommended)**: `handbok.org/view?company=name`

The new approach is more stable and doesn't suffer from redirect loops that can happen with subdomain routing in Next.js App Router.

### Accessing Handbooks

To view a handbook, use the `/view` route with a `company` query parameter:

```
https://handbok.org/view?company=companyname
```

### Fallback Page

If redirect loops are detected, a static fallback page will be shown:

```
/static-fallback.html
```

This page can be accessed directly and will reset any redirect counters.
