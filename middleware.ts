import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const CACHE_TTL_SECONDS = Number(process.env.MIDDLEWARE_CACHE_TTL_SECONDS || '300');
const CACHE_MAX_ENTRIES = Number(process.env.MIDDLEWARE_CACHE_MAX_ENTRIES || '1000');

type CacheEntry = { id: string; expiresAt: number };

// Lightweight LRU cache with TTL. Uses a Map to preserve insertion order
// and moves recently used entries to the end. Works in Node and also in
// many Edge runtimes where module scope persists while the worker is warm.
class LRUCache {
  private map: Map<string, CacheEntry>;
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.map = new Map();
    this.maxEntries = maxEntries;
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry;
  }

  set(key: string, value: CacheEntry) {
    // remove existing so insertion order is updated
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    // trim if necessary
    while (this.map.size > this.maxEntries) {
      const firstKey = this.map.keys().next().value;
      if (!firstKey) break;
      this.map.delete(firstKey);
    }
  }
}

const numeroToIdCache = new LRUCache(CACHE_MAX_ENTRIES);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) If route is /os/<numero_expediente>/... and segment is not a uuid, try to resolve
  const osMatch = pathname.match(/^\/os\/([^\/]+)(\/.*)?$/);
  if (osMatch) {
    const segment = osMatch[1];
    const rest = osMatch[2] || '';
    if (!uuidRegex.test(segment) && SUPABASE_URL && SUPABASE_ANON_KEY) {
      // Check cache first (LRU)
      const cached = numeroToIdCache.get(segment);
      if (cached) {
        const newUrl = `/os/${cached.id}${rest}`;
        return NextResponse.rewrite(new URL(newUrl, request.url));
      }
      try {
        const url = `${SUPABASE_URL}/rest/v1/eventos?select=id&numero_expediente=eq.${encodeURIComponent(segment)}&limit=1`;
        const res = await fetch(url, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Accept: 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && data[0].id) {
            const id = data[0].id;
            // store in cache (LRU)
            try {
              numeroToIdCache.set(segment, { id, expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000 });
            } catch (e) {
              // ignore cache errors
            }
            const newUrl = `/os/${id}${rest}`;
            return NextResponse.rewrite(new URL(newUrl, request.url));
          }
        }
      } catch (err) {
        // ignore and continue to auth check
      }
    }
  }

  // 2) Global auth check using Supabase server client (keeps previous behavior)
  let response = NextResponse.next({ request: { headers: request.headers } });

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const supabase = createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => {
                try {
                  request.cookies.set(name, value);
                } catch (e) {
                  // cookie set might fail in edge; ignore
                }
              });
            },
          },
        }
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user && !request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (err) {
      // ignore auth errors — allow request
    }
  }

  // Add caching headers for static assets
  if (request.nextUrl.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf)$/i)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  // Add caching headers for API responses
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
  }

  return response;
}

export const config = {
  matcher: ['/os/:path*', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
