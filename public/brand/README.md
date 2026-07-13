# H.M. Aurora — Brand Assets

Primary logo lockup (chrome wordmark, molecular cluster, ECG pulse, winged
caduceus). Transparent background — **use on dark/navy surfaces** (PDR §4.1).

| File | Use |
| --- | --- |
| `hm-aurora-logo.png` | Web-optimized, whitespace-trimmed (1000×276). Used in NavBar + Footer via `next/image`. |
| `hm-aurora-logo-source.png` | Full-resolution original (1024×1024), untrimmed. Archive / print source. |

Reference in components with a root-absolute path so `next/image` applies the
deploy `basePath` automatically: `src="/brand/hm-aurora-logo.png"`.

The compact square mark for mobile/favicon remains the coded `AuroraMark`
(`src/components/AuroraLogo.tsx`).
