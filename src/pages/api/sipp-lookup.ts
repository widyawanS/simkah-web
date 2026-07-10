import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { courtUrl, keyword } = body;

    if (!courtUrl || !keyword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'courtUrl dan keyword wajib diisi'
      }), { status: 400 });
    }

    const baseUrl = courtUrl.replace(/\/+$/, '');
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
      return new Response(JSON.stringify({
        success: false,
        blocked: false,
        courtUrl: baseUrl,
        error: 'Server pengadilan tidak dapat diakses'
      }), { status: 502 });
    }

    const html = await mainPageRes.text();

    // Detect Cloudflare or other blocking
    if (isBlocked(html)) {
      return new Response(JSON.stringify({
        success: false,
        blocked: true,
        courtUrl: baseUrl,
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
        return new Response(JSON.stringify({
          success: false,
          blocked: true,
          courtUrl: baseUrl,
          error: 'Server pengadilan memblokir akses otomatis. Silakan kunjungi langsung untuk menelusuri perkara.'
        }), { status: 403 });
      }
      return new Response(JSON.stringify({
        success: false,
        blocked: false,
        courtUrl: baseUrl,
        error: 'Pencarian gagal. Server pengadilan mengembalikan error.'
      }), { status: 502 });
    }

    const searchHtml = await searchRes.text();

    // Step 3: Parse results table
    const results = parseSearchResults(searchHtml, baseUrl);

    return new Response(JSON.stringify({
      success: true,
      data: results,
      total: results.length,
    }), { status: 200 });

  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      return new Response(JSON.stringify({
        success: false,
        blocked: false,
        courtUrl: baseUrl || '',
        error: 'Permintaan timeout. Server pengadilan mungkin sedang sibuk.'
      }), { status: 504 });
    }
    return new Response(JSON.stringify({
      success: false,
      blocked: false,
      courtUrl: baseUrl || '',
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

  // Match table rows from tablePerkaraAll
  const tableMatch = html.match(/<table[^>]*id="tablePerkaraAll"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return results;

  const tableHtml = tableMatch[1];

  // Match each row
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let skipHeader = true;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];

    // Skip header row
    if (skipHeader && (rowHtml.includes('<th') || rowHtml.includes('NOMOR') || rowHtml.includes('Nomor'))) {
      skipHeader = false;
      continue;
    }

    // Extract cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
    }

    // Extract detail link
    const linkMatch = rowHtml.match(/href="([^"]*show_detil[^"]*)"/i);
    let detailUrl = '';
    if (linkMatch) {
      detailUrl = linkMatch[1];
      if (!detailUrl.startsWith('http')) {
        detailUrl = baseUrl + (detailUrl.startsWith('/') ? '' : '/') + detailUrl;
      }
    }

    // Expected columns: No, Nomor, Tanggal, Klasifikasi, Para Pihak, Status, Lama Proses, Link
    if (cells.length >= 6) {
      const nomor = cells[1] || '';
      const klasifikasi = cells[3] || '';
      const status = cells[5] || '';

      if (nomor && nomor !== '-') {
        results.push({
          nomor,
          klasifikasi,
          status,
          detailUrl,
        });
      }
    }
  }

  return results;
}
