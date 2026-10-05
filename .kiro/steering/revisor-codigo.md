---
inclusion: always
---

# Code Review Guidelines

## Portuguese (Brazil) Localization
- All user-facing text must be in **português do Brasil**.
- API error messages should also be in Portuguese, using clear and professional language.

## Code Style
- Use TypeScript for all new code (`.ts` and `.tsx` files).
- Follow Next.js App Router conventions (pages in `app/`, server components by default).
- Use absolute imports from `@/` when possible, or relative imports for deeply nested components.
- Prefer functional components with clear prop interfaces.
- Use TypeScript `type` for simple unions/intersections and `interface` for object shapes and extendable types.

## Architecture Patterns

### API Routes (`app/api/`)
- Use Next.js Route Handlers (`route.ts`) for all new API endpoints.
- Validate input and handle errors explicitly.
- Return structured JSON responses with appropriate HTTP status codes.
- Implement authentication checks before processing requests.

### Components (`components/`)
- Create reusable, self-contained components.
- Use CSS Modules (`*.module.css`) for component-specific styling.
- Prefer semantic HTML and accessibility best practices.
- Follow the design system defined in `design-system.md` and use tokens from `globals.css` (no hardcoded hex values).

### Database Layer (`lib/db/`)
- Use the `db` instance from `lib/db/index.ts` for database operations.
- Implement proper error handling and transaction management.
- Avoid N+1 queries; batch operations when possible.

### Auth0 Integration
- Use the Auth0 utility functions in `lib/auth0.ts`.
- Implement proper authorization checks using `lib/auth/authorization.ts`.
- Never log or expose sensitive authentication tokens.

## Specific Rules for This Project
- All calendar and availability features must respect the `America/Sao_Paulo` timezone.
- Character and campaign data structures should be validated before persistence.
- The "master" role should have elevated permissions but still follow the same validation rules as regular users.
- All commit messages must follow the conventional format: `type: description` (feat|fix|refactor|style|chore|docs).

## Quality Gatekeepers
- Run `npm run lint` before suggesting commits.
- Ensure TypeScript compilation succeeds (`npm run build`).
- Verify that no secrets or sensitive data are present in code or logs.
- Review database migrations carefully—ensure they are backward-compatible and reversible when possible.