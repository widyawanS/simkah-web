import type { APIRoute } from 'astro';

// In-memory cache
const resultCache = new Map<string, { data: any; expires: number }>();
const blockCache = new Map<string, { blocked: boolean; expires: number }>();

const RESULT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const BLOCK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  const remaining = Math.max(0, Math.ceil((entry.expires - Date.now()) / 1000));
  return remaining;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { courtUrl, keyword, courtName } = body;

    if (!courtUrl || !keyword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'courtUrl dan keyword wajib diisi'
      }), { status: 400 });
    }

    const baseUrl = courtUrl.replace(/\/+$/, '');
    const cacheKey = `${baseUrl}::${keyword.toLowerCase().trim()}`;

    // Check result cache first
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), { status: 200 });
    }

    // Check if this SIPP instance is currently blocked
    if (isInstanceBlocked(baseUrl)) {
      return new Response(JSON.stringify({
        success: false,
        blocked: true,
        courtUrl: baseUrl,
        courtName: courtName || '',
        retryAfter: getBlockRemaining(baseUrl),
        error: 'Server pengadilan sedang memblokir akses. Silakan coba lagi atau kunjungi langsung.'
      }), { status: 403 });
    }

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

    // Step 1: Fetch main page to get enc token
    const mainPageRes = await fetch(baseUrl + '/', {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!mainPageRes.ok) {
      markInstanceBlocked(baseUrl);
      return new Response(JSON.stringify({
        success: false,
        blocked: false,
        courtUrl: baseUrl,
        courtName: courtName || '',
        retryAfter: Math.ceil(BLOCK_CACHE_TTL / 1000),
        error: 'Server pengadilan tidak dapat diakses'
      }), { status: 502 });
    }

    const html = await mainPageRes.text();

    // Detect Cloudflare or other blocking
    if (isBlocked(html)) {
      markInstanceBlocked(baseUrl);
      return new Response(JSON.stringify({
        success: false,
        blocked: true,
        courtUrl: baseUrl,
        courtName: courtName || '',
        retryAfter: Math.ceil(BLOCK_CACHE_TTL / 1000),
        error: 'Server pengadilan memblokir akses otomatis. Silakan kunjungi langsung untuk menelusuri perkara.'
      }), { status: 403 });
    }

    // Extract enc token from hidden input
    const encMatch = html.match(/name="enc"\s+value="([^"]+)"/);
    if (!encMatch) {
      return new Response(JSON.stringify({
        success: false,
        blocked: false,
        courtUrl: baseUrl,
        courtName: courtName || '',
        error: 'Gagal mengambil token dari SIPP. Struktur halaman mungkin berubah.'
      }), { status: 502 });
    }

    const encToken = encMatch[1];

    // Step 2: POST search
    const searchParams = new URLSearchParams();
    searchParams.append('search_keyword', keyword);
    searchParams.append('enc', encToken);

    const searchRes = await fetch(baseUrl + '/list_perkara/search', {
      method: 'POST',
      headers: {
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        'Referer': baseUrl + '/',
      },
      body: searchParams.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!searchRes.ok) {
      const searchHtml = await searchRes.text();
      if (isBlocked(searchHtml)) {
        markInstanceBlocked(baseUrl);
        return new Response(JSON.stringify({
          success: false,
          blocked: true,
          courtUrl: baseUrl,
          courtName: courtName || '',
          retryAfter: Math.ceil(BLOCK_CACHE_TTL / 1000),
          error: 'Server pengadilan memblokir akses otomatis. Silakan kunjungi langsung untuk menelusuri perkara.'
        }), { status: 403 });
      }
      return new Response(JSON.stringify({
        success: false,
        blocked: false,
        courtUrl: baseUrl,
        courtName: courtName || '',
        error: 'Pencarian gagal. Server pengadilan mengembalikan error.'
      }), { status: 502 });
    }

    const searchHtml = await searchRes.text();

    // Step 3: Parse results table
    const results = parseSearchResults(searchHtml, baseUrl);

    const response = {
      success: true,
      data: results,
      total: results.length,
    };

    // Cache successful results
    setCachedResult(cacheKey, response);

    return new Response(JSON.stringify(response), { status: 200 });

  } catch (err: any) {
    const baseUrl = body?.courtUrl?.replace(/\/+$/, '') || '';
    if (err.name === 'TimeoutError') {
      if (baseUrl) markInstanceBlocked(baseUrl);
      return new Response(JSON.stringify({
        success: false,
        blocked: false,
        courtUrl: baseUrl,
        courtName: body?.courtName || '',
        retryAfter: Math.ceil(BLOCK_CACHE_TTL / 1000),
        error: 'Permintaan timeout. Server pengadilan mungkin sedang sibuk.'
      }), { status: 504 });
    }
    return new Response(JSON.stringify({
      success: false,
      blocked: false,
      courtUrl: baseUrl,
      courtName: body?.courtName || '',
      error: 'Terjadi kesalahan internal. Silakan coba lagi nanti.'
    }), { status: 500 });
  }
};

function isBlocked(html: string): boolean {
  const indicators = [
    'cf-browser-verification',
    'challenge-platform',
    'Just a moment',
    'Checking if the site connection is secure',
    'cf-challenge',
    'Enable JavaScript and cookies to continue',
    'ray ID',
    'cloudflare',
  ];
  const lower = html.toLowerCase();
  return indicators.some(i => lower.includes(i.toLowerCase()));
}

function parseSearchResults(html: string, baseUrl: string) {
  const results: Array<{
    nomor: string;
    klasifikasi: string;
    status: string;
    detailUrl: string;
  }> = [];

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
