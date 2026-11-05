/**
 * src/lib/auth.ts
 * Auth admin sederhana: password dari env + cookie sesi bertanda tangan HMAC.
 *
 * Alasan dibuat di level aplikasi (bukan mengandalkan Basic Auth Nginx/CloudPanel):
 * situs sudah pindah ke Coolify, jadi proteksi proxy lama belum tentu berlaku.
 *
 * Env yang dibutuhkan:
 *   ADMIN_PASSWORD        - password login admin (wajib di production)
 *   ADMIN_SESSION_SECRET  - string acak panjang untuk menandatangani cookie (wajib)
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'simkah_admin';
const MAX_AGE = 60 * 60 * 12; // 12 jam

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || '';
}

export function authConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD && !!secret();
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** Bandingkan dua string tanpa bocoran timing */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  return safeEqual(input, expected);
}

/** Buat token sesi: base64url(expiry).signature */
export function createSessionToken(): string {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = String(exp);
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

/** Validasi token sesi. Return true bila tanda tangan cocok dan belum kedaluwarsa. */
export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || !secret()) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [b64exp, sig] = parts;
  let payload: string;
  try {
    payload = Buffer.from(b64exp, 'base64url').toString('utf-8');
  } catch {
    return false;
  }
  const expected = sign(payload);
  if (expected.length !== sig.length || !safeEqual(expected, sig)) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

export function sessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}; Secure`;
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

/** Baca cookie dari header Cookie mentah */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}
