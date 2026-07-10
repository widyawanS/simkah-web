import type { APIRoute } from 'astro';
import http from 'node:http';
import https from 'node:https';
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

function httpGet(url: string, headers: Record<string, string>, timeout: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const proto = parsed.protocol === 'https:' ? https : http;
    const req = proto.get(url, { headers, timeout }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf-8') }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

function httpGetViaProxy(url: string, proxyUrl: string, headers: Record<string, string>, timeout: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const agent = new HttpsProxyAgent(proxyUrl);
    const parsed = new URL(url);
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers,
      agent,
      timeout,
    };
    const proto = parsed.protocol === 'https:' ? https : http;
    const req = proto.request(reqOpts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf-8') }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Proxy timeout')); });
    req.on('error', reject);
    req.end();
  });
}

export const GET: APIRoute = async ({ url }) => {
  const targetUrl = url.searchParams.get('url') || 'https://ipv4.webshare.io/';
  const rawProxies = getRawProxies();
  const parsedProxies = getParsedProxies();
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  const results: any = {
    envConfigured: { PROXY_URLS: !!PROXY_URLS, PROXY_LIST_URL: !!PROXY_LIST_URL },
    proxyCount: rawProxies.length,
    proxySample: rawProxies.slice(0, 3),
    parsedSample: parsedProxies.slice(0, 3),
    tests: [] as any[],
  };

  // Test 1: Direct
  try {
    const start = Date.now();
    const r = await httpGet(targetUrl, { 'User-Agent': UA }, 8000);
    results.tests.push({ name: 'Direct (no proxy)', ok: r.status >= 200 && r.status < 400, status: r.status, latencyMs: Date.now() - start, bodyPreview: r.body.substring(0, 200) });
  } catch (e: any) {
    results.tests.push({ name: 'Direct (no proxy)', ok: false, error: e.message });
  }

  // Test 2: Via proxy
  if (parsedProxies.length > 0) {
    const proxyRaw = rawProxies[0];
    const proxyParsed = parsedProxies[0];
    try {
      const start = Date.now();
      const r = await httpGetViaProxy(targetUrl, proxyParsed, { 'User-Agent': UA }, 10000);
      results.tests.push({ name: `Via proxy ${proxyRaw}`, ok: r.status >= 200 && r.status < 400, status: r.status, latencyMs: Date.now() - start, bodyPreview: r.body.substring(0, 200) });
    } catch (e: any) {
      results.tests.push({ name: `Via proxy ${proxyRaw}`, ok: false, error: e.message });
    }
  }

  // Test 3: SIPP
  const sippUrl = url.searchParams.get('sipp');
  if (sippUrl) {
    const sippHeaders = { 'User-Agent': UA, 'Accept': 'text/html' };
    // Direct
    try {
      const start = Date.now();
      const r = await httpGet(sippUrl, sippHeaders, 10000);
      results.tests.push({
        name: `SIPP direct: ${sippUrl}`, ok: r.status >= 200 && r.status < 400, status: r.status,
        latencyMs: Date.now() - start,
        hasEnc: /name="enc"\s+value="([^"]+)"/.test(r.body),
        isBlocked: r.body.toLowerCase().includes('cloudflare') || r.body.toLowerCase().includes('just a moment'),
        bodyPreview: r.body.substring(0, 300),
      });
    } catch (e: any) {
      results.tests.push({ name: `SIPP direct: ${sippUrl}`, ok: false, error: e.message });
    }
    // Via proxy
    if (parsedProxies.length > 0) {
      try {
        const start = Date.now();
        const r = await httpGetViaProxy(sippUrl, parsedProxies[0], sippHeaders, 12000);
        results.tests.push({
          name: `SIPP via proxy: ${rawProxies[0]}`, ok: r.status >= 200 && r.status < 400, status: r.status,
          latencyMs: Date.now() - start,
          hasEnc: /name="enc"\s+value="([^"]+)"/.test(r.body),
          isBlocked: r.body.toLowerCase().includes('cloudflare') || r.body.toLowerCase().includes('just a moment'),
          bodyPreview: r.body.substring(0, 300),
        });
      } catch (e: any) {
        results.tests.push({ name: `SIPP via proxy: ${rawProxies[0]}`, ok: false, error: e.message });
      }
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
