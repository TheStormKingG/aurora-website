/**
 * Prefix a public/ asset path with the deploy base path.
 *
 * Under `output: "export"` next/image does NOT add basePath to a string
 * `src` — it only prefixes its own /_next/* assets. On GitHub Pages the
 * site lives under /aurora-website, so a raw src="/brand/x.png" 404s
 * (it resolves to the domain root). Wrap public asset paths with this.
 *
 * NEXT_PUBLIC_BASE_PATH is inlined at build time; empty locally and on a
 * custom domain, so asset("/brand/x.png") is correct in every target.
 */
export function asset(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path}`;
}
