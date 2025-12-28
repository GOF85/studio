# Studio - AI Coding Instructions

## Project Overview
Next.js 15 (App Router) application using Supabase for backend/auth, TanStack Query for data fetching, and Genkit for AI flows.

## Core Architecture & Patterns

### 1. Supabase & ID Resolution
- **Client**: Use `@/lib/supabase` for the browser client.
- **OS ID Resolution**: Many components receive an `osId` which can be either a UUID or a `numero_expediente`. **Always** use `resolveOsId(osId)` from `@/lib/supabase` before querying tables like `eventos` or `comercial_ajustes`.
  ```typescript
  import { resolveOsId } from '@/lib/supabase';
  const targetId = await resolveOsId(osId);
  ```

### 2. Data Fetching (React Query)
- Centralized in `hooks/use-data-queries.ts`.
- Follow the pattern: `useQuery({ queryKey: ['key', id], queryFn: ... })`.
- Mutations should invalidate relevant queries on success.
- Use `services/` for complex CRUD logic (e.g., `espacios-service.ts`) instead of putting it directly in hooks.

### 3. Middleware
- `middleware.ts` handles auth and path rewriting for `numero_expediente`.
- It includes a custom `LRUCache` and `fetchWithRetry` to handle network instability.
- Avoid making heavy changes here without testing impact on performance and auth flow.

### 4. AI Integration
- Powered by **Genkit**. Flows are located in `ai/flows/`.
- Configuration is in `ai/genkit.ts`.
- Use `genkit start` via `npm run genkit:dev` to test flows locally.

### 5. UI & Components
- Organized by domain in `components/` (e.g., `components/auth/`, `components/calendar/`).
- Shared UI components use Radix UI + Tailwind CSS (Shadcn pattern).
- Icons: Use `lucide-react`.

## Developer Workflows

### Critical Commands
- `npm run dev`: Start development server.
- `npm run typecheck`: Run TypeScript compiler check (crucial before PRs).
- `npm run lint`: Run ESLint.
- `./diagnose-setup.sh`: Run this if you encounter environment or connection issues.
- `npm run test`: Run Vitest suite.

### Documentation
- Refer to `docs/DOCUMENTACION_INDEX.md` for a complete map of the project's extensive documentation.
- `docs/guia_rapida/START_HERE.md` is the best entry point for new features or fixes.

## Conventions
- **Types**: Centralized in `types/index.ts` or domain-specific files in `types/`.
- **Naming**: Use kebab-case for files and PascalCase for React components.
- **Error Handling**: Use the `ErrorBoundary` component for wrapping complex UI sections.

## UI/UX & Style Guidelines (Reference: `docs/dev/style.md`)
- **Clean Page Pattern**: Follow the order: Imports → Pure Helpers → Typed Local Subcomponents → Main Component (hooks first, then UX effects, then JSX).
- **URL-driven UI**: Reflect tabs and filters in the URL (e.g., `?tab=`). Ensure page reloads maintain state.
- **Zero Redundancy**: Avoid H1 titles that repeat information already present in breadcrumbs.
- **UX Feedback**: Use skeletons that match the final structure (not generic spinners) and dedicated empty state components.
- **Visual Style**: 
  - Use `rounded-lg` for cards.
  - **Semantic Palette**: Amber for "Attention/Pending", Emerald for "Success/Confirmed", Blue for "Technical Info", Orange for "Gastronomy".
  - **Sticky Elements**: Use `sticky top-0` (or `top-12` to align with breadcrumbs) + `backdrop-blur` for headers and toolbars.
- **Navigation**: Prefer programmatic navigation (`router.push`) for clickable cards instead of wrapping large blocks in `<Link>`.
- **Scroll Management**: Force scroll to top (`behavior: 'instant'`) when changing tabs or navigating to details.
- **Alignment**: Content must align with the main header using `container` or `max-w-7xl mx-auto px-4`. Avoid negative margins on main containers.
