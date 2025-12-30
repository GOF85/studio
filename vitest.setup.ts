import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock console.error to prevent logging to stderr in tests.
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

// Mock next/navigation for testing
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    forward: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
  }),
  usePathname: () => '/mock-pathname',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Use vi.stubEnv to set environment variables for the test environment.
// This is the recommended Vitest approach for stubbing env vars.
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321'); // Dummy URL for testing
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS10ZW5uYW50LWtleSJ9.examplekey'); // Dummy key for testing


