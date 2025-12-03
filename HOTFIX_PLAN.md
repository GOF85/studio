Hotfix Implementation Plan for Studio App
Repository: https://github.com/GOF85/studio (main branch, as of December 03, 2025)
Objective: Apply targeted hotfixes to enhance security, performance, and scalability. Ensure compatibility with Next.js 15.5.6, Supabase (Auth, Postgres, RLS, Realtime), React Query 5.90, and Vercel deployment. Target: Support 50 concurrent users, 10,000 ingredient references, 1,000 recipes, and 1,000 events/year with <1s load times and zero data leaks.
Branch Strategy: Create hotfix/prod-ready from main. Implement atomically, with isolated commits. Merge via PR after CI passes.
Environment Setup:

Node.js v20+.
Supabase project with existing tables (ingredientes, recetas, eventos, profiles, tenants if partial multi-tenancy exists).
Vercel env vars: SUPABASE_URL, SUPABASE_ANON_KEY.
Test command: npm run build && npm run dev. Validate no errors in console/network tab.

Implement in sequence. Each hotfix includes code snippets for direct copy-paste. Use TypeScript strict mode. Run npm run lint -- --fix post-implementation.
Hotfix 1: Middleware for Authentication Guards (1 hour)
Rationale: Mitigate unauthorized access to private routes. Enforce session validation and tenant isolation using Supabase middleware client. Prevents data exfiltration via RLS bypass.
Implementation:

Create middleware.ts at project root.TypeScriptimport { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && !req.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (session) {
    const { data: profile, error } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single();
    if (error || !profile) return NextResponse.redirect(new URL('/error', req.url));

    const tenantId = profile.tenant_id;
    req.headers.set('x-tenant-id', tenantId);

    const tenantSlug = req.nextUrl.pathname.split('/')[1];
    if (tenantSlug) {
      const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single();
      if (!tenant || tenant.id !== tenantId) return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|auth).*)'] };
Update queries in hooks (e.g., use-data-store.ts) and pages (e.g., book/ingredientes/page.tsx): Append .eq('tenant_id', tenantId) to all supabase.from(table).select(). Fetch tenantId via headers().get('x-tenant-id') in server components or session in client hooks.
Validation: Simulate 2 users with different tenant_ids. Access protected routes; confirm isolation.
Commit: git add middleware.ts && git commit -m "hotfix: implement middleware for auth and tenant isolation".

Hotfix 2: Server-Side Pagination in Data Tables (2 hours)
Rationale: Prevent OOM and latency in large datasets (10k+ rows). Use React Query infinite queries with Supabase RPC for offset-based pagination, ensuring O(1) complexity per page.
Implementation:

In Supabase SQL Editor, create RPC functions for paginated fetches (e.g., for ingredientes):SQLCREATE OR REPLACE FUNCTION get_ingredientes_paginated(p_tenant_id UUID, p_offset INT, p_limit INT)
RETURNS TABLE (id UUID, name TEXT, reference TEXT, unit TEXT, cost_per_unit NUMERIC) AS $$  
SELECT id, name, reference, unit, cost_per_unit
FROM ingredientes
WHERE tenant_id = p_tenant_id
OFFSET p_offset LIMIT p_limit;
  $$ LANGUAGE sql SECURITY DEFINER;Repeat for recetas, eventos, etc. Enable RLS on RPC if needed.
Install/update React Query if absent: npm i @tanstack/react-query.
In relevant hook (e.g., hooks/use-paginated-data.ts):TypeScriptimport { useInfiniteQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export function usePaginatedIngredientes(tenantId: string) {
  const supabase = useSupabaseClient();

  return useInfiniteQuery({
    queryKey: ['ingredientes', tenantId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_ingredientes_paginated', {
        p_tenant_id: tenantId,
        p_offset: pageParam * 20,
        p_limit: 20
      });
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.length === 20 ? (lastPage.nextCursor || undefined) : undefined,
  });
}
In page/component (e.g., book/ingredientes/page.tsx): Replace fetch with hook. Render flatMap(pages) in DataTable with infinite scroll trigger on fetchNextPage.
Validation: Insert 500 fake rows in Supabase. Scroll; confirm chunked loading (<200ms/page).
Commit: git commit -m "hotfix: server-side pagination with React Query and Supabase RPC".

Hotfix 3: Server Actions for Computations (1 hour)
Rationale: Offload sensitive computations (e.g., cost aggregates) to server to prevent client-side tampering and reduce latency via batched queries.
Implementation:

Create app/control-explotacion/cpr/costeMP/actions.ts:TypeScript'use server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function computeCosteMP(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { cookies: () => cookieStore });

  const tenantId = headers().get('x-tenant-id');
  const { data: orders, error } = await supabase.from('orders').select('items').eq('tenant_id', tenantId);
  if (error) throw error;

  const total = orders.reduce((acc, order) => acc + order.items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0), 0);

  return { total, details: orders };
}
In form/page: Set action={computeCosteMP} on . Handle response in UI.
Validation: Submit form; inspect network – confirm server-side execution. Attempt client manipulation; verify no effect.
Commit: git commit -m "hotfix: server actions for secure cost computations".

Hotfix 4: Commit Hygiene and UI Cleanup (1 hour)
Rationale: Standardize commits for maintainability; enable dark mode for accessibility; remove unused deps to reduce bundle size.
Implementation:

Create CHANGELOG.md:Markdown# Changelog

## v1.1.0 (2025-12-03)
- feat: Supabase migration for proveedores
- fix: Pagination in ingredientes table
- chore: Project restructure to route groups
Dark mode: Update tailwind.config.ts:TypeScriptmodule.exports = { darkMode: 'class', ... };Add toggle: Create components/ThemeToggle.tsx with useTheme hook. Integrate in header.
Remove bloat: npm uninstall genkit-ai (if unused). Run npm prune.
Commit: Use conventional commits.

Hotfix 5: Basic Testing Suite (2 hours)
Rationale: Automate validation to prevent regressions in CI pipeline.
Implementation:

Install: npm i -D jest @testing-library/react @testing-library/jest-dom ts-jest jest-environment-jsdom.
jest.config.ts:TypeScriptmodule.exports = { preset: 'ts-jest', testEnvironment: 'jsdom', setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'] };jest.setup.ts: import '@testing-library/jest-dom';
Test file __tests__/ingredientes.test.tsx:TypeScriptimport { render, screen } from '@testing-library/react';
import IngredientesPage from '../app/book/ingredientes/page';

test('renders 10 ingredients on initial load', () => {
  render(<IngredientesPage />);
  expect(screen.getAllByRole('row').length).toBe(10);
});
CI yaml (.github/workflows/ci.yml):YAMLname: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
Run: npm test.

Hotfix 6: Excel Export Feature (30 minutes)
Rationale: Enable formatted data export for reporting.
Implementation:

Install: npm i xlsx.
In costeMP/page.tsx:TypeScriptimport * as XLSX from 'xlsx';

const exportToExcel = () => {
  const ws = XLSX.utils.json_to_sheet(costesMPDetallados.map(item => ({
    Referencia: item.referencia,
    Cantidad: item.cantidad,
    CosteUnitario: item.costeUnitario.toFixed(4),
    CosteTotal: item.costeMPTotal.toFixed(2),
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CosteMP');
  XLSX.writeFile(wb, `CosteMP_${new Date().toISOString().slice(0,10)}.xlsx`);
};

// UI integration: <Button onClick={exportToExcel}>Exportar a Excel</Button>

Hotfix 7: Full Multi-Tenancy (1 day)
Rationale: Isolate data per tenant for scalability.
Implementation:

DB Schema: Add tenant_id UUID REFERENCES tenants(id) to all tables via Supabase dashboard. Migrate existing data.
RLS Policies:SQLCREATE POLICY "tenant_isolation" ON table_name AS PERMISSIVE FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())) WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
Auth Flow: Update signup to insert tenant/profiles.
Routing: Use path-based (/[tenant-slug]/...) or subdomains via Vercel.
Queries: Enforce .eq('tenant_id', ... ) globally.

Deployment and Validation

Merge: PR to main, review changes.
Deploy: git push → Vercel auto-build.
Post-Deploy: Monitor Vercel logs/analytics for errors. Test with load (e.g., 50 tabs open).

Implement sequentially. Report errors with logs