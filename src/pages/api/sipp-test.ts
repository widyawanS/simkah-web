import type { APIRoute } from 'astro';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PROXY_LIST_URL = import.meta.env.PROXY_LIST_URL || '';
const PROXY_URLS = import.meta.env.PROXY_URLS || '';

function parseProxyLine(line: string): string | null {
  const l = line.trim();
  if (!l || l.startsWith('#')) return null;
  const parts = l.split(':');
  if (parts.length === 4) {
    const [host, port, user, pass] = parts;
    return `http://${user}:${pass}@${host}:${port}`;
  }
  if (l.startsWith('http')) return l;
  return null;
}

function getRawProxies(): string[] {
  if (PROXY_URLS) {
    return PROXY_URLS.split('\n').map(l => l.trim()).filter(l => l && l.includes(':'));
  }
  return [];
}

function getParsedProxies(): string[] {
  if (PROXY_URLS) {
    return PROXY_URLS.split('\n').map(parseProxyLine).filter(Boolean) as string[];
  }
  return [];
}

export const GET: APIRoute = async ({ url }) => {
  const targetUrl = url.searchParams.get('url') || 'https://ipv4.webshare.io/';
  const rawProxies = getRawProxies();
  const parsedProxies = getParsedProxies();

  const results: any = {
    envConfigured: {
      PROXY_URLS: !!PROXY_URLS,
      PROXY_LIST_URL: !!PROXY_LIST_URL,
    },
    proxyCount: rawProxies.length,
    proxySample: rawProxies.slice(0, 3),
    parsedSample: parsedProxies.slice(0, 3),
    tests: [] as any[],
  };

  // Test 1: Direct connection (no proxy)
  try {
    const start = Date.now();
    const res = await fetch(targetUrl, { signal: AbortSignal.timeout(8000) });
    const body = await res.text();
    results.tests.push({
      name: 'Direct (no proxy)',
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - start,
      bodyPreview: body.substring(0, 200),
    });
  } catch (e: any) {
    results.tests.push({
      name: 'Direct (no proxy)',
      ok: false,
      error: e.message,
    });
  }

  // Test 2: Via first proxy
  if (parsedProxies.length > 0) {
    const proxyUrl = parsedProxies[0];
    try {
      const start = Date.now();
      const agent = new HttpsProxyAgent(proxyUrl);
      const res = await fetch(targetUrl, {
        // @ts-ignore
        agent,
        signal: AbortSignal.timeout(10000),
      });
      const body = await res.text();
      results.tests.push({
        name: `Via proxy ${rawProxies[0]}`,
        ok: res.ok,
        status: res.status,
        latencyMs: Date.now() - start,
        bodyPreview: body.substring(0, 200),
      });
    } catch (e: any) {
      results.tests.push({
        name: `Via proxy ${rawProxies[0]}`,
        ok: false,
        error: e.message,
      });
    }
  }

  // Test 3: Try a real SIPP page if specified
  const sippUrl = url.searchParams.get('sipp');
  if (sippUrl) {
    // Direct
    try {
      const start = Date.now();
      const res = await fetch(sippUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(10000),
      });
      const body = await res.text();
      results.tests.push({
        name: `SIPP direct: ${sippUrl}`,
        ok: res.ok,
        status: res.status,
        latencyMs: Date.now() - start,
        hasEnc: /name="enc"\s+value="([^"]+)"/.test(body),
        isBlocked: body.toLowerCase().includes('cloudflare') || body.toLowerCase().includes('just a moment'),
        bodyPreview: body.substring(0, 300),
      });
    } catch (e: any) {
      results.tests.push({ name: `SIPP direct: ${sippUrl}`, ok: false, error: e.message });
    }

    // Via proxy
    if (parsedProxies.length > 0) {
      try {
        const start = Date.now();
        const agent = new HttpsProxyAgent(parsedProxies[0]);
        const res = await fetch(sippUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          // @ts-ignore
          agent,
          signal: AbortSignal.timeout(12000),
        });
        const body = await res.text();
        results.tests.push({
          name: `SIPP via proxy: ${sippUrl}`,
          ok: res.ok,
          status: res.status,
          latencyMs: Date.now() - start,
          hasEnc: /name="enc"\s+value="([^"]+)"/.test(body),
          isBlocked: body.toLowerCase().includes('cloudflare') || body.toLowerCase().includes('just a moment'),
          bodyPreview: body.substring(0, 300),
        });
      } catch (e: any) {
        results.tests.push({ name: `SIPP via proxy: ${sippUrl}`, ok: false, error: e.message });
      }
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
