# Project Overview

This is a Next.js project that uses TypeScript. It appears to be a web application for managing catering services, with features related to recipes, ingredients, clients, and events.

**Key Technologies:**

*   **Framework:** Next.js
*   **Language:** TypeScript
*   **Backend:** Supabase
*   **Styling:** Tailwind CSS
*   **UI:** Radix UI, shadcn-ui
*   **Data Fetching:** React Query
*   **AI:** Genkit

# Building and Running

To get the project up and running, you'll need to have Node.js and npm installed.

**1. Install Dependencies:**

```bash
npm install
```

**2. Set up Environment Variables:**

Create a `.env.local` file in the root of the project and add the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

**3. Run the Development Server:**

```bash
npm run dev
```

This will start the development server on `http://localhost:3000`.

**4. Build for Production:**

```bash
npm run build
```

**5. Start the Production Server:**

```bash
npm run start
```

# Project Structure

The project follows a clean, organized structure with all source files at the root level:

## Directory Structure

```
studio/
├── app/                          ← Next.js App Router
│   ├── (auth)/                   ← Public authentication routes
│   │   └── login/
│   ├── (dashboard)/              ← Private routes (requires auth)
│   │   ├── layout.tsx            ← Dashboard layout with Header
│   │   ├── page.tsx              ← Main dashboard
│   │   ├── book/                 ← Gastronomic Book (recipes, ingredients)
│   │   ├── control-explotacion/  ← Financial control
│   │   ├── entregas/             ← MICE deliveries
│   │   ├── analitica/            ← Analytics and reports
│   │   ├── bd/                   ← Databases (clients, providers, etc.)
│   │   ├── cpr/                  ← Production Center
│   │   ├── os/                   ← Service Orders
│   │   ├── rrhh/                 ← Human Resources
│   │   └── ...                   ← Other modules
│   ├── api/                      ← API routes
│   ├── globals.css               ← Global styles
│   └── layout.tsx                ← Root layout (global providers)
│
├── components/                   ← Reusable UI components
│   ├── ui/                       ← shadcn-ui components
│   ├── layout/                   ← Layout components (Header, etc.)
│   ├── dashboard/
│   └── ...
│
├── lib/                          ← Utilities and configuration
│   ├── supabase.ts               ← Supabase client
│   ├── utils.ts                  ← General utilities
│   └── constants.ts
│
├── hooks/                        ← Custom React hooks
│   ├── use-data-store.ts         ← Global data store
│   ├── use-supabase.ts           ← Supabase hooks
│   └── ...
│
├── types/                        ← TypeScript type definitions
│   └── index.ts
│
├── providers/                    ← React Context providers
│   ├── auth-provider.tsx
│   └── query-provider.tsx
│
├── services/                     ← External service integrations
├── ai/                           ← AI configuration (Genkit)
├── migrations/                   ← Database migrations (SQL files)
└── middleware.ts                 ← Auth & route protection
```

## Key Features

### Route Organization
- **Route Groups**: Uses `(auth)` and `(dashboard)` for logical separation
- **Nested Layouts**: Dashboard routes share a common layout with Header
- **Protected Routes**: Middleware automatically protects all routes except `/login`

### Path Aliases
All imports use the `@/` alias pointing to the root:
```typescript
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import type { ServiceOrder } from '@/types';
```

### Middleware
- Protects all routes except public ones
- Uses `@supabase/ssr` for session management
- Automatic redirect to `/login` for unauthenticated users

# Data Migration

A major data migration was completed to move all business data from `localStorage` to Supabase. This was done to improve performance, security, and scalability. The migration involved creating over 40 tables in Supabase and implementing over 15 React Query hooks.

You can find more information about the migration in the following files:

*   `MIGRATION_README.md`
*   `migrations/` directory (SQL migration files)
*   `lib/migrate-localStorage.ts`
*   `app/(dashboard)/migration/page.tsx`

For detailed structure documentation, see `ESTRUCTURA_PROYECTO.md`.

# Development Conventions

*   **Linting:** The project uses ESLint for linting. You can run the linter with `npm run lint`.
*   **Type Checking:** The project uses TypeScript for type checking. You can run the type checker with `npm run typecheck`.
*   **Code Formatting:** The project uses Prettier for code formatting. It's recommended to set up your editor to format on save.
*   **Styling:** The project uses Tailwind CSS for styling. It's recommended to use the Tailwind CSS IntelliSense extension for VS Code.
*   **Components:** The project uses shadcn-ui for components. You can add new components with the `npx shadcn-ui@latest add` command.
