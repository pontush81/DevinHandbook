# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server (localhost:3000) 
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run devfix` - Fix duplicate routes and start dev server

### Testing
- `npm run test` - Run all tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:components` - Test only components
- `npm run test:lib` - Test only library utilities
- `npm run test:auth` - Test authentication functionality

### Security & Utilities
- `npm run security:check` - Run security audit
- `npm run security:full` - Full security scan with Snyk
- `npm run check-stripe` - Verify Stripe configuration
- `npm run check-architecture` - Run architecture validation

### MCP Tools (Development)
- `npm run mcp:setup` - Copy MCP environment template
- `npm run mcp:docs` - View MCP documentation

## Architecture Overview

### Core Technology Stack
- **Framework**: Next.js 15.3.2 with App Router and TypeScript
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with Google OAuth and cross-subdomain cookies
- **Payments**: Stripe with multi-environment configuration
- **Content**: EditorJS for rich text editing with custom components
- **Styling**: Tailwind CSS 4 with Radix UI and shadcn/ui components
- **State**: React Context + Zustand for complex state management

### Database Architecture

The system uses Supabase with these core tables:
- `handbooks` - Core handbook entities with subscription status
- `sections` - Hierarchical content organization  
- `pages` - EditorJS-based content with rich formatting
- `handbook_members` - Role-based access (admin/editor/viewer)
- `subscriptions` - Stripe subscription management
- `profiles` - User profiles with superadmin capabilities

### Key Services

**Authentication System** (`src/lib/auth-*.ts`):
- Multi-client Supabase setup for different contexts
- Cross-subdomain session management for handbok.org
- Automatic retry logic and session recovery
- Synchronized localStorage and cookie storage

**Subscription Management** (`src/lib/subscription-service.ts`):
- Professional lifecycle management with health monitoring
- Trial system with 30-day periods and conversion tracking
- Automatic status synchronization via cron jobs
- Stripe webhook processing for payment events

**Content Management** (`src/lib/handbook-*.ts`):
- Hierarchical content structure (Handbook → Sections → Pages)
- Complete BRF (Swedish housing cooperative) templates
- AI-powered document import with OCR via Google Cloud Vision
- Smart content conversion to EditorJS format

**Access Control** (`src/lib/access-control.ts`):
- Hierarchical permissions (superadmin → owner → member → public)
- Cached access control with audit logging
- Role-based content visibility and editing rights

### Routing and Middleware

The system uses sophisticated routing:
- **Subdomain routing**: `company.handbok.org` for handbook access
- **Rewrites**: Automatic subdomain to path conversion
- **Redirects**: SEO-friendly canonical URL enforcement
- **CORS**: Cross-domain resource handling with proper headers

### API Structure

API routes are organized by function:
- `/api/admin/*` - Admin-only operations
- `/api/auth/*` - Authentication endpoints
- `/api/handbook/*` - Handbook CRUD operations  
- `/api/stripe/*` - Payment processing
- `/api/debug/*` - Development and diagnostic tools
- `/api/ocr/*` - Document processing with Google Cloud Vision

### Development Rules

Based on `documentation/development-rules.md`:
- **Deployment**: Frontend/API on Vercel, background jobs on Railway
- **Environment variables**: All secrets as env vars, never hardcoded
- **Code organization**: Max 200-300 lines per file, documentation in `/documentation`
- **Testing**: Always test in staging before production
- **Type safety**: Full TypeScript coverage required
- **Security**: Credentials never committed, comprehensive access control

### Common Patterns

**Error Handling**:
- Comprehensive try/catch with specific error types
- User-friendly error messages with technical details in logs
- Automatic retry logic for transient failures

**State Management**:
- React Context for authentication and global state
- Zustand for complex component state
- React Query for server state and caching

**Content Processing**:
- EditorJS for rich content with custom tools
- OCR pipeline: PDF/image → Google Vision → structured text
- Smart content import with automatic section detection

### Security Considerations

- Row Level Security (RLS) policies on all Supabase tables
- CSRF protection on state-changing operations
- Input validation using Zod schemas
- Secure headers and Content Security Policy
- GDPR compliance with data export/deletion workflows

### Testing Strategy

Comprehensive test coverage with:
- Unit tests for all utility functions in `src/lib/`
- Component tests using React Testing Library
- Integration tests for API endpoints
- Authentication flow testing with mock providers

### File Structure Notes

- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - Reusable UI components
- `src/lib/` - Core business logic and utilities
- `src/types/` - TypeScript type definitions
- `documentation/` - Comprehensive project documentation
- `supabase/migrations/` - Database schema and changes