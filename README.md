# Proof of Run

> yeah nah prove it

Private run-tracking leaderboard for a Bridge to Brisbane training crew. Snap a photo of your run (treadmill, watch, Strava, finish-line selfie), Claude reads the stats and writes a cheeky reaction, the run gets posted to a shared feed and leaderboard.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **shadcn/ui** (Base UI primitives) for components
- **Vercel KV** (Upstash Redis) for run data
- **Vercel Blob** for photo storage
- **Anthropic SDK** — `claude-sonnet-4-5` for vision extraction + reactions
- Deployed on **Vercel**

No auth, no database, no Supabase. Open submission, runner picked from a dropdown.

## Setup

1. **Link the Vercel project** (creates the `.vercel` directory and lets you pull env vars):
   ```bash
   npx vercel link
   ```

2. **Create the storage integrations** in the Vercel dashboard:
   - Marketplace → KV → connect to this project
   - Storage → Blob → connect to this project

3. **Pull env vars** from Vercel into `.env.local`:
   ```bash
   npx vercel env pull .env.local
   ```

4. **Add your Anthropic key** to `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   Also add it to the Vercel project env vars for production. See `.env.example` for the full list of vars expected.

5. **Seed the runners**. Edit the placeholder names in `scripts/seed-runners.ts`, then:
   ```bash
   npx tsx scripts/seed-runners.ts
   ```

6. **Run the dev server**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Data model (Vercel KV)

| Key | Type | Contents |
| --- | --- | --- |
| `runners` | JSON | `Runner[]` — the crew |
| `runs:{id}` | JSON | A single `Run` |
| `runs:index` | sorted set | Run IDs scored by `createdAt` (feed pagination) |
| `runs:byRunner:{runnerId}` | sorted set | Run IDs for one runner scored by `createdAt` (history + streak) |

Types live in `src/lib/types.ts`. KV helpers in `src/lib/kv.ts`.

## API

| Route | Notes |
| --- | --- |
| `POST /api/analyse-run` | multipart with `photo` + `runnerId`. Uploads to Blob, calls Claude vision, returns the parsed stats + photoUrl. Does **not** persist anything — the client edits and confirms first. |
| `POST /api/runs` | Persists the confirmed run. |
| `GET /api/feed?limit=20&cursor={ms}` | Paginated feed (joined with runner). |
| `GET /api/leaderboard?period=week\|month\|all&sortBy=totalKm\|longestRun\|bestPace\|currentStreak` | Aggregated leaderboard rows. |
| `GET /api/runners` | The runner list. |

## Pages

- `/` — feed + "Show us then" submit dialog
- `/leaderboard` — period tabs + sort dropdown

## Submit flow

1. Pick runner from dropdown
2. Upload/take photo (`<input type="file" accept="image/*" capture="environment">` so mobile opens the camera)
3. `POST /api/analyse-run` → Blob upload + Claude vision
4. Confirmation form with editable distance/duration/reaction (pace auto-recomputes)
5. `POST /api/runs` → feed refresh

## Design

The UI is intentionally bare shadcn/Tailwind — semantic CSS variables, no theme work yet. A designer will re-skin this via the Figma MCP. Don't pretty it up further; aim for a recognisable wireframe.

## Out of scope (this pass)

- Auth (open submission)
- Strava OAuth
- Push notifications
- Final visual design

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
npx tsx scripts/seed-runners.ts  # seed runners into KV
```
