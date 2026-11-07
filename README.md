# LexSolve AI

Mobile-first legal research and problem-solving app for Nigerian law students.
Next.js 15 + React 19 + TypeScript + Tailwind 4, deployed on Cloudflare Workers via OpenNext, with Firebase Auth and Firestore.

> Free-tools path with real free-plan limits: see **FREE_TOOLS.md**.

## What is built (all 11 pages and the full research pipeline)

| Area | Where |
|---|---|
| Landing, login, dashboard | `src/app/page.tsx`, `login`, `(app)/dashboard` |
| Problem solver (IPAC/IRAC, depth, uploads, library, authorities) | `(app)/solver` |
| Legal Research, Library, Case Explorer, History, Saved, My Authorities, Admin | `(app)/*` |
| Pipeline: analyzer, orchestrator, verification, ratio, answer, report | `src/lib/research/*` |
| Pluggable legal sources | `src/lib/research/sources/*` |
| Token-verified API routes | `src/app/api/*` |
| Firestore security rules | `firestore.rules` |

## Honest status you must know

1. **OpenLegal/CaseWin is a locked stub.** Its developer docs could not be read when this was generated, and guessing endpoints is forbidden by your own spec. Until you implement `src/lib/research/sources/openlegal.ts` from the real docs, the app runs with NO live legal database. It says so in every answer ("No external legal database is connected"), cites only authorities you supply, and lists any other possible authorities as "unverified leads". It never fakes a search.
2. **Not compiled yet.** The code was written without network access, so `npm install` and `npm run build` were not run. Expect a few type errors on the first build. Paste them into Claude and they get fixed fast.
3. Rate limiting is per Worker instance (fine for launch). Per-user daily quotas are not built yet.
4. Library vector search runs in the browser over your own chunks. Free and private, fine for student-sized libraries (about 1,500 passages). Move to a real vector index later if needed.
5. Firebase Storage is NOT used (it now requires a paid plan). Files are read in the browser and only the extracted text and embeddings are stored in Firestore.

## Next steps, in order (all free)

### 1. Accounts and tools (free)
- GitHub account, and a repo named `lexsolve-ai` (private)
- Cloudflare account (Workers free plan)
- Firebase project on the **Spark (free)** plan
- Google AI Studio API key (free tier) at aistudio.google.com
- Editor: GitHub Codespaces (free monthly hours) or Replit, since you are on Android. Node 20 or newer.

### 2. Firebase setup
1. Firebase console, create project `lexsolve-ai`.
2. Build > Authentication > Get started. Enable **Email/Password** and **Google**.
3. Authentication > Settings > Authorized domains: add your future `*.workers.dev` domain later.
4. Build > Firestore Database > Create database (production mode).
5. Project settings > Your apps > Web app. Copy the 4 config values.
6. Publish rules: paste `firestore.rules` into Firestore > Rules > Publish. (Or `npm i -g firebase-tools`, `firebase login`, `firebase deploy --only firestore`.)
7. Make yourself admin: Firestore > Start collection `admins` > Document ID = your Auth UID (copy from Authentication > Users) > add any field, for example `role: "admin"`.

### 3. Run locally
```bash
npm install
cp .env.example .env.local        # fill the 4 NEXT_PUBLIC_FIREBASE_* values
cp .dev.vars.example .dev.vars    # fill AI_API_KEY (Gemini key)
npm run dev
```
Open the app, sign up, try the solver. Without OpenLegal you will see the honest "no database" notice.

### 4. Implement the legal database source
Open https://openlegal.casewinai.com/developers yourself, then paste the endpoint docs into Claude and ask it to implement `search`, `fetchFull` and `lookupCitation` in `openlegal.ts`. Then set `OPENLEGAL_API_KEY` and `OPENLEGAL_VERIFIED=true` as secrets. Check their usage limits and terms first. Other sources (for example a licensed law report) are added the same way as one more file in `sources/`.

### 5. Push to GitHub
```bash
git init && git add . && git commit -m "LexSolve AI"
git remote add origin https://github.com/YOU/lexsolve-ai.git && git push -u origin main
```
`.gitignore` already keeps `.env*`, `.dev.vars` and keys out of Git.

### 6. Deploy to Cloudflare Workers
```bash
npx wrangler login
npx wrangler secret put AI_API_KEY
npx wrangler secret put AI_BASE_URL      # https://generativelanguage.googleapis.com/v1beta/openai
npx wrangler secret put AI_MODEL         # current Gemini flash model name from AI Studio
npx wrangler secret put EMBED_MODEL      # current Gemini embedding model name
# later: OPENLEGAL_API_KEY and OPENLEGAL_VERIFIED
npm run deploy
```
The 4 `NEXT_PUBLIC_FIREBASE_*` values are read at build time, so keep them in `.env.local` when you run `npm run deploy` locally. For automatic builds from GitHub, use Cloudflare dashboard > Workers > Create > Import a repository, build command `npx opennextjs-cloudflare build`, deploy command `npx wrangler deploy`, and add the 4 values as build variables.

After the first deploy, add the `lexsolve-ai.<you>.workers.dev` domain to Firebase Authentication > Authorized domains so Google sign-in works.

### 7. Before real students use it
- Test with 5 real problem questions and read every citation yourself.
- Add a feedback button (the `feedback` collection and admin view are ready).
- Check provider free-tier limits. Cloudflare's free plan allows 50 subrequests per request, which is why research depth has a call budget in `src/lib/config.ts`. A paid Workers plan raises it and lets Deep Research go wider.

## Security notes
- Secrets live only in Cloudflare Worker secrets. Nothing private is in frontend code.
- Every API route verifies the Firebase ID token (`jose` against Google keys).
- Admin routes check `admins/{uid}` server-side. Users can read only their own data (see rules).
- The model may cite only authorities labelled in its context. Unknown citation markers are stripped before display.
