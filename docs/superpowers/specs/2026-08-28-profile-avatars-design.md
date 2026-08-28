# Design — Profile Avatars

**Project:** H.M. Aurora website (`aurora-website`)
**Date:** 2026-08-28 · **Status:** Draft for review
**Builds on:** patient auth (Plan 1) + Google sign-in (both live). Related: PDR §8 (data minimisation), §11 (no clinical data).

---

## 1. Summary

Give patient accounts a profile picture. Resolution order for what displays:

1. **Chosen avatar** — an uploaded photo, or one of 12 cartoon avatars the user picked.
2. **Google photo** — if the user signed in with Google and hasn't chosen an avatar (read live from the session; not stored).
3. **Placeholder** — the user's initials on an Aurora gradient (generated, no asset).

Users change it from the dashboard: pick a cartoon, upload a photo, or use their Google photo.

## 2. Scope & decisions

| Decision | Choice |
|---|---|
| Storage of the choice | One new nullable `profiles.avatar` text column |
| Uploaded photos | **Supabase Storage** bucket `avatars` (public-read; per-user-folder write RLS) |
| Cartoon avatars | **12 self-contained inline SVGs**, "geometric character faces" in the Aurora palette (no external service) |
| Google photo | Read live from `user_metadata` (`avatar_url`/`picture`); **not** copied into our DB |
| Where shown | Dashboard Profile section (with a picker) + a small avatar on the nav "Account" chip |

**Out of scope:** avatars for corporate/staff (don't exist yet); image cropping/editing; animated avatars; syncing the Google photo into Storage.

## 3. Data model

- **`profiles.avatar text` (nullable)** — encodes the chosen avatar:
  - `null` → no choice → resolver falls back to Google photo → initials.
  - `"cartoon:N"` where N is 1–12 → render cartoon avatar N.
  - an `https://…` URL → an uploaded image (a Storage public URL).
  RLS already lets a user update their own `profiles` row (Plan 1) — no new table RLS.

- **Supabase Storage bucket `avatars`** (migration/config):
  - **Public read** (avatars display via public URL — no signed URLs needed).
  - **Write policies on `storage.objects`**: an authenticated user may INSERT/UPDATE/DELETE only where `bucket_id = 'avatars'` AND `(storage.foldername(name))[1] = auth.uid()::text` — i.e. only inside their own `{uid}/` folder.
  - Bucket file-size limit 2 MB; allowed MIME types `image/jpeg`, `image/png`, `image/webp`.

## 4. Components

**Created**
- `src/lib/avatar.ts` — pure resolver + helpers, unit-tested:
  - `resolveAvatar(avatar: string | null, googlePicture: string | null, fullName: string | null): AvatarDescriptor` where `AvatarDescriptor = { kind: "cartoon"; n: number } | { kind: "image"; url: string } | { kind: "initials"; text: string }`. Rules: `avatar` starts with `cartoon:` → cartoon; starts with `http` → image; else if `googlePicture` → image(googlePicture); else → initials (first letters of `fullName`, else "A").
  - `initials(fullName)` and `CARTOON_COUNT = 12`.
- `src/components/Avatar.tsx` — renders an `AvatarDescriptor` at a given size: `image` → `<img>` (rounded, object-cover); `cartoon` → `<CartoonAvatar n>`; `initials` → gradient circle with the letters.
- `src/components/CartoonAvatar.tsx` — 12 "geometric character face" SVGs generated from a config array (each entry: background color/gradient from the palette + simple geometric features — eyes, brow, mouth — varied across the 12). `CartoonAvatar({ n, className })` renders face N.
- `src/components/AvatarPicker.tsx` — client picker: shows current avatar, a keyboard-navigable grid of the 12 cartoons (click to select → save), an **Upload** control (`<input type="file" accept="image/*">`, client-validates type + ≤2 MB), and a **"Use my Google photo"** button shown only when a Google photo exists (it sets `avatar` back to `null`, reverting to the live Google-photo fallback). Each action writes `profiles.avatar` and calls an `onChange` so the dashboard updates instantly.
- `src/lib/avatar-upload.ts` — `uploadAvatar(file): Promise<string>`: validates type/size, uploads to `avatars/{uid}/{timestamp}.{ext}` (unique name avoids stale-cache), returns the public URL. (Old files may linger — acceptable for v1; optional cleanup later.)

**Modified**
- `src/app/account/patient/PatientDashboard.tsx` — Profile section shows `<Avatar>` (larger) with a "Change photo" toggle that reveals `<AvatarPicker>`; load the current `profiles.avatar` and the Google photo (from `getUser().user_metadata`) into state.
- `src/components/NavBar.tsx` — the "Account" chip (signed-in state) shows a small `<Avatar>` beside/instead of the users icon. It reads the same source; a lightweight fetch of `profiles.avatar` on mount is acceptable (or reuse a shared hook).
- Migration file for the bucket + storage policies + the `profiles.avatar` column.

## 5. Data flow

- **Display (dashboard/nav):** read `profiles.avatar` (own row via RLS) + `user_metadata.avatar_url|picture` from the session → `resolveAvatar(...)` → `<Avatar>`.
- **Pick a cartoon:** `update profiles set avatar = 'cartoon:N'` → local state updates.
- **Upload:** `uploadAvatar(file)` → Storage → `update profiles set avatar = <publicUrl>` → local state updates.
- **Use Google photo:** `update profiles set avatar = null` → reverts to the live Google-photo fallback (no URL is stored). Local state updates.

## 6. Security & privacy

- Uploads live only under the user's own `{uid}/` folder, enforced by Storage RLS; other users cannot write there. Public read is intentional (avatars are shown in the UI); the folder name is a UUID, not enumerable PII.
- Client + bucket both cap size (2 MB) and restrict to image MIME types.
- No clinical/special-category data (PDR §11) — a profile picture is ordinary personal data; deleting the account (existing flow) removes the profile row; a later hardening task can also purge Storage files.
- The Google photo URL is Google-hosted; we only reference it (or snapshot the URL if the user picks "use Google photo"). No third-party script is loaded — it's a plain `<img src>` to Google's CDN. (Note: this is the one outbound image request to a Google domain; acceptable and expected for a Google-photo avatar. Users who prefer none can pick a cartoon or upload.)

## 7. Error handling

- Upload rejects wrong type/oversize with an inline message; a failed Storage upload shows a retry message and leaves the current avatar unchanged.
- A broken/removed image URL: `<img>` `onError` falls back to the initials placeholder.
- Resolver never throws — any unexpected `avatar` value falls through to Google photo → initials.

## 8. Testing

- **Unit (`src/lib/avatar.ts`):** `resolveAvatar` returns cartoon for `"cartoon:3"`, image for an `http…` URL, image(googlePicture) when avatar is null but a Google photo exists, initials otherwise; `initials("Stefan Gravesande") === "SG"`.
- **e2e (Playwright + axe):** the dashboard renders an avatar and a "Change photo" control; opening the picker is axe-clean and the 12 cartoon options are keyboard-focusable. (Real upload + Storage round-trip is a documented manual smoke, not automated.)
- `npm run verify` green.

## 9. Acceptance criteria

- A Google user sees their Google photo by default; any user can pick one of 12 cartoons or upload a photo, and it shows immediately on the dashboard and nav.
- Uploaded files land only in the user's own Storage folder (RLS-proven); public read works for display.
- With nothing set and no Google photo, initials render.
- No clinical data; `npm run verify` green; static export still deploys.

## 10. Open items

- Final look of the 12 geometric faces is an implementation detail — easy to iterate after first render.
- Optional later: delete the previous Storage file on re-upload; purge Storage on account deletion.
