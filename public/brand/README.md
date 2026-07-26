# H.M. Aurora — Brand Assets

Primary logo lockup (chrome wordmark, molecular cluster, ECG pulse, winged
caduceus). Transparent background — **use on dark/navy surfaces** (PDR §4.1).

| File | Use |
| --- | --- |
| `hm-aurora-logo.png` | Web-optimized, whitespace-trimmed (1000×276). Used in NavBar + Footer via `next/image`. |
| `hm-aurora-logo-source.png` | Full-resolution original (1024×1024), untrimmed. Archive / print source. |

Reference these via the `asset()` helper (`src/lib/asset.ts`), NOT a raw
string src: `src={asset("/brand/hm-aurora-logo.png")}`. Under `output: export`
next/image does NOT prepend the deploy `basePath` to a string src, so a raw
`/brand/…` path 404s on GitHub Pages (served under `/aurora-website`). The
helper adds `NEXT_PUBLIC_BASE_PATH` for you and is a no-op locally / on a
custom domain.

The compact square mark for mobile/favicon remains the coded `AuroraMark`
(`src/components/AuroraLogo.tsx`).
