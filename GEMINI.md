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

# File Overview

*   `src/app`: This directory contains all of the pages for the application. Each subdirectory corresponds to a route in the application.
*   `src/components`: This directory contains all of the reusable components for the application.
*   `src/lib`: This directory contains all of the utility functions and libraries for the application.
*   `src/hooks`: This directory contains all of the custom React hooks for the application.
*   `src/services`: This directory contains all of the services for the application, which are used to interact with external APIs.
*   `src/types`: This directory contains all of the TypeScript types for the application.
*   `supabase`: This directory contains all of the Supabase-related files, including the database schema and migrations.
*   `migrations`: This directory contains all of the database migrations.

# Data Migration

A major data migration was completed to move all business data from `localStorage` to Supabase. This was done to improve performance, security, and scalability. The migration involved creating over 40 tables in Supabase and implementing over 15 React Query hooks.

You can find more information about the migration in the following files:

*   `MIGRATION_README.md`
*   `migration_localStorage_to_supabase.sql`
*   `src/lib/migrate-localStorage.ts`
*   `src/app/migration/page.tsx`

# Development Conventions

*   **Linting:** The project uses ESLint for linting. You can run the linter with `npm run lint`.
*   **Type Checking:** The project uses TypeScript for type checking. You can run the type checker with `npm run typecheck`.
*   **Code Formatting:** The project uses Prettier for code formatting. It's recommended to set up your editor to format on save.
*   **Styling:** The project uses Tailwind CSS for styling. It's recommended to use the Tailwind CSS IntelliSense extension for VS Code.
*   **Components:** The project uses shadcn-ui for components. You can add new components with the `npx shadcn-ui@latest add` command.
