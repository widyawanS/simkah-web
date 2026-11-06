export const SITE = {
  url: "https://simkah.web.id",
  name: "SIMKAH Tools",
  description:
    "Panduan daftar nikah online via SIMKAH 2026: syarat N1-N4, alur KUA, biaya Rp0 vs Rp600rb, plus kalkulator dan skrining catin gratis.",
  logo: "https://simkah.web.id/logo-simkah.png",
  ogImage: "https://simkah.web.id/images/og-default.jpg",
  language: "id-ID",
} as const;

export const AUTHOR = {
  name: "Widyawan Sigitmanto",
  alternateName: "Widyawan",
  jobTitle: "Penghulu & Penulis",
  url: "https://simkah.web.id/about",
  image: "https://simkah.web.id/images/team/widyawan-sigitmanto/avatar.webp",
} as const;

export const ORG_ID = `${SITE.url}/#organization`;
export const WEBSITE_ID = `${SITE.url}/#website`;
export const PERSON_ID = `${AUTHOR.url}#person`;

/** Ubah path/URL gambar menjadi absolut terhadap domain situs. */
export function absoluteUrl(path?: string): string {
  if (!path) return SITE.ogImage;
  try {
    return new URL(path, SITE.url).toString();
  } catch {
    return SITE.ogImage;
  }
}

/** JSON-LD aman untuk disisipkan ke <script>. */
export function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
