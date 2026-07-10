import type { APIRoute } from 'astro';
import { HttpsProxyAgent } from 'https-proxy-agent';

// ── Cache ──────────────────────────────────────────────
const resultCache = new Map<string, { data: any; expires: number }>();
const blockCache = new Map<string, { blocked: boolean; expires: number }>();

const RESULT_CACHE_TTL = 10 * 60 * 1000;
const BLOCK_CACHE_TTL = 5 * 60 * 1000;

function getCachedResult(key: string) {
  const entry = resultCache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data;
  resultCache.delete(key);
  return null;
}

function setCachedResult(key: string, data: any) {
  resultCache.set(key, { data, expires: Date.now() + RESULT_CACHE_TTL });
}

function isInstanceBlocked(baseUrl: string) {
  const entry = blockCache.get(baseUrl);
  if (entry && entry.blocked && Date.now() < entry.expires) return true;
  if (entry && Date.now() >= entry.expires) blockCache.delete(baseUrl);
  return false;
}

function markInstanceBlocked(baseUrl: string) {
  blockCache.set(baseUrl, { blocked: true, expires: Date.now() + BLOCK_CACHE_TTL });
}

function getBlockRemaining(baseUrl: string): number {
  const entry = blockCache.get(baseUrl);
  if (!entry || !entry.blocked) return 0;
  return Math.max(0, Math.ceil((entry.expires - Date.now()) / 1000));
}

// ── Proxy Pool ─────────────────────────────────────────
// Supports two modes:
//   PROXY_LIST_URL  = Webshare API URL (fetches live list)
//   PROXY_URLS      = newline-separated "host:port:user:pass" (manual paste)
const PROXY_LIST_URL = import.meta.env.PROXY_LIST_URL || '';
const PROXY_URLS = import.meta.env.PROXY_URLS || '';
const proxyCache = { list: [] as string[], expires: 0 };
const PROXY_CACHE_TTL = 5 * 60 * 1000;
const MAX_PROXY_ATTEMPTS = 3;

function parseProxyLine(line: string): string | null {
  const l = line.trim();
  if (!l || l.startsWith('#')) return null;

  // Format: host:port:user:pass → http://user:pass@host:port
  const parts = l.split(':');
  if (parts.length === 4) {
    const [host, port, user, pass] = parts;
    return `http://${user}:${pass}@${host}:${port}`;
  }

  // Already a URL like http://user:pass@host:port
  if (l.startsWith('http')) return l;

  return null;
}

async function getProxyList(): Promise<string[]> {
  if (proxyCache.list.length > 0 && Date.now() < proxyCache.expires) {
    return proxyCache.list;
  }

  // Mode 1: From env PROXY_URLS (manual paste, no network fetch needed)
  if (PROXY_URLS) {
    const parsed = PROXY_URLS.split('\n').map(parseProxyLine).filter(Boolean) as string[];
    if (parsed.length > 0) {
      proxyCache.list = parsed;
      proxyCache.expires = Date.now() + PROXY_CACHE_TTL;
      return parsed;
    }
  }

  // Mode 2: From Webshare API (PROXY_LIST_URL)
  if (PROXY_LIST_URL) {
    try {
      const res = await fetch(PROXY_LIST_URL, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return proxyCache.list.length > 0 ? proxyCache.list : [];

      const text = await res.text();
      const parsed = text.split('\n').map(parseProxyLine).filter(Boolean) as string[];
      if (parsed.length > 0) {
        proxyCache.list = parsed;
        proxyCache.expires = Date.now() + PROXY_CACHE_TTL;
        return parsed;
      }
    } catch {
      return proxyCache.list.length > 0 ? proxyCache.list : [];
    }
  }

  return proxyCache.list.length > 0 ? proxyCache.list : [];
}

function getRandomProxies(count: number, exclude: Set<string>): string[] {
  const available = proxyCache.list.filter(p => !exclude.has(p));
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── SIPP Fetch Helpers ─────────────────────────────────
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FETCH_HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
};

async function fetchWithProxy(url: string, options: RequestInit = {}, proxyUrl?: string): Promise<Response> {
  if (!proxyUrl) {
    return fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
  }
  const agent = new HttpsProxyAgent(proxyUrl);
  return fetch(url, {
    ...options,
    // @ts-ignore — https-proxy-agent dispatcher
    agent,
    signal: AbortSignal.timeout(12000),
  });
}

async function fetchSippPage(url: string, proxyUrl?: string): Promise<{ ok: boolean; blocked: boolean; html: string }> {
  const res = await fetchWithProxy(url, { headers: FETCH_HEADERS }, proxyUrl);
  if (!res.ok) return { ok: false, blocked: false, html: '' };
  const html = await res.text();
  return { ok: true, blocked: isBlocked(html), html };
}

async function postSippSearch(baseUrl: string, encToken: string, keyword: string, proxyUrl?: string): Promise<{ ok: boolean; blocked: boolean; html: string }> {
  const params = new URLSearchParams();
  params.append('search_keyword', keyword);
  params.append('enc', encToken);

  const res = await fetchWithProxy(baseUrl + '/list_perkara/search', {
    method: 'POST',
    headers: {
      ...FETCH_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': baseUrl + '/',
    },
    body: params.toString(),
  }, proxyUrl);

  if (!res.ok) {
    const html = await res.text();
    return { ok: false, blocked: isBlocked(html), html };
  }
  return { ok: true, blocked: false, html: await res.text() };
}

// ── Main Handler ───────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  let baseUrl = '';
  let courtNameVal = '';

  try {
    const body = await request.json();
    const { courtUrl, keyword, courtName } = body;

    if (!courtUrl || !keyword) {
      return new Response(JSON.stringify({
        success: false, error: 'courtUrl dan keyword wajib diisi'
      }), { status: 400 });
    }

    baseUrl = courtUrl.replace(/\/+$/, '');
    courtNameVal = courtName || '';
    const cacheKey = `${baseUrl}::${keyword.toLowerCase().trim()}`;

    // 1. Cache hit?
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), { status: 200 });
    }

    // 2. Block active?
    if (isInstanceBlocked(baseUrl)) {
      return new Response(JSON.stringify({
        success: false, blocked: true, courtUrl: baseUrl, courtName: courtNameVal,
        retryAfter: getBlockRemaining(baseUrl),
        error: 'Server pengadilan sedang memblokir akses. Silakan coba lagi atau kunjungi langsung.'
      }), { status: 403 });
    }

    // 3. Try via proxy first, then direct
    const triedProxies = new Set<string>();
    let lastError = '';
    const log: string[] = [];

    // Attempt via proxy
    const proxies = await getProxyList();
    log.push(`[proxy] loaded ${proxies.length} proxies from env`);
    if (proxies.length > 0) {
      const proxyBatch = getRandomProxies(MAX_PROXY_ATTEMPTS, triedProxies);
      log.push(`[proxy] trying ${proxyBatch.length} proxies`);
      for (const proxy of proxyBatch) {
        triedProxies.add(proxy);
        try {
          const result = await executeSearch(baseUrl, keyword, proxy);
          if (result) {
            log.push(`[proxy] SUCCESS via ${proxy}`);
            setCachedResult(cacheKey, { ...result, debug: log });
            return new Response(JSON.stringify({ ...result, debug: log }), { status: 200 });
          }
          log.push(`[proxy] no enc token via ${proxy}`);
        } catch (e: any) {
          log.push(`[proxy] FAIL ${proxy}: ${e.message}`);
          lastError = e.message || 'Proxy failed';
        }
      }
    }

    // 4. Fallback: direct request
    try {
      log.push(`[direct] trying direct connection`);
      const result = await executeSearch(baseUrl, keyword, undefined);
      if (result) {
        log.push(`[direct] SUCCESS`);
        setCachedResult(cacheKey, { ...result, debug: log });
        return new Response(JSON.stringify({ ...result, debug: log }), { status: 200 });
      }
      log.push(`[direct] no enc token found`);
    } catch (e: any) {
      log.push(`[direct] FAIL: ${e.message}`);
      lastError = e.message || 'Direct request failed';
    }

    // 5. All failed — mark blocked
    markInstanceBlocked(baseUrl);
    return new Response(JSON.stringify({
      success: false, blocked: false, courtUrl: baseUrl, courtName: courtNameVal,
      retryAfter: Math.ceil(BLOCK_CACHE_TTL / 1000),
      error: 'Semua percobaan gagal. Server pengadilan mungkin sedang tidak dapat diakses.',
      debug: log,
    }), { status: 502 });

  } catch (err: any) {
    if (err.name === 'TimeoutError' && baseUrl) markInstanceBlocked(baseUrl);
    return new Response(JSON.stringify({
      success: false, blocked: false, courtUrl: baseUrl, courtName: courtNameVal,
      retryAfter: Math.ceil(BLOCK_CACHE_TTL / 1000),
      error: err.name === 'TimeoutError'
        ? 'Permintaan timeout. Server pengadilan mungkin sedang sibuk.'
        : 'Terjadi kesalahan internal. Silakan coba lagi nanti.'
    }), { status: err.name === 'TimeoutError' ? 504 : 500 });
  }
};

// ── Execute Search (proxy or direct) ───────────────────
async function executeSearch(baseUrl: string, keyword: string, proxyUrl?: string) {
  // Step 1: Get enc token
  const mainPage = await fetchSippPage(baseUrl + '/', proxyUrl);
  if (!mainPage.ok) return null;
  if (mainPage.blocked) return null;

  const encMatch = mainPage.html.match(/name="enc"\s+value="([^"]+)"/);
  if (!encMatch) return null;

  // Step 2: Search
  const searchResult = await postSippSearch(baseUrl, encMatch[1], keyword, proxyUrl);
  if (!searchResult.ok) return null;
  if (searchResult.blocked) return null;

  // Step 3: Parse
  const results = parseSearchResults(searchResult.html, baseUrl);
  return { success: true, data: results, total: results.length };
}

// ── Helpers ────────────────────────────────────────────
function isBlocked(html: string): boolean {
  const indicators = [
    'cf-browser-verification', 'challenge-platform', 'Just a moment',
    'Checking if the site connection is secure', 'cf-challenge',
    'Enable JavaScript and cookies to continue', 'ray ID', 'cloudflare',
  ];
  const lower = html.toLowerCase();
  return indicators.some(i => lower.includes(i.toLowerCase()));
}

function parseSearchResults(html: string, baseUrl: string) {
  const results: Array<{ nomor: string; klasifikasi: string; status: string; detailUrl: string }> = [];
  const tableMatch = html.match(/<table[^>]*id="tablePerkaraAll"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;

  const tableHtml = tableMatch[1];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let skipHeader = true;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];
    if (skipHeader && (rowHtml.includes('<th') || rowHtml.includes('NOMOR') || rowHtml.includes('Nomor'))) {
      skipHeader = false;
      continue;
    }

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
    }

    const linkMatch = rowHtml.match(/href="([^"]*show_detil[^"]*)"/i);
    let detailUrl = '';
    if (linkMatch) {
      detailUrl = linkMatch[1];
      if (!detailUrl.startsWith('http')) {
        detailUrl = baseUrl + (detailUrl.startsWith('/') ? '' : '/') + detailUrl;
      }
    }

    if (cells.length >= 6) {
      const nomor = cells[1] || '';
      const klasifikasi = cells[3] || '';
      const status = cells[5] || '';
      if (nomor && nomor !== '-') {
        results.push({ nomor, klasifikasi, status, detailUrl });
      }
    }
  }
  return results;
}
