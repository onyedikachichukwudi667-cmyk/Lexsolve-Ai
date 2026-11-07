# Free tools path: from zero to deployed

Every tool below has a free tier that is enough to build, deploy and test LexSolve AI.
Free limits change, so confirm the current numbers on each pricing page before you launch.

## The stack and what it costs

| Job | Tool | Free tier | Watch out for |
|---|---|---|---|
| Code editor (Android friendly) | GitHub Codespaces | Monthly free core-hours on personal accounts | Stop the codespace when idle so hours last |
| Backup editor | github.dev (press `.` on any repo) | Free, browser editor | No terminal, so you cannot run npm |
| Alternative cloud editor | Replit | Free starter plan | Limited resources, slower builds |
| Code hosting | GitHub | Free private repos | Never commit `.env` or `.dev.vars` (already git-ignored) |
| Login | Firebase Authentication | Email and Google sign-in free | Phone/SMS login is paid, do not use it |
| Database | Firestore on the Spark plan | About 1 GiB storage, 50,000 reads and 20,000 writes per day | Library search reads chunks, so a big library uses reads. The app caches them per session |
| AI answers and embeddings | Google AI Studio (Gemini) key | Free tier with per-minute and per-day limits | Free tier requests may be used by Google to improve products. Do not send private client or exam material you must keep confidential |
| Hosting | Cloudflare Workers | Free plan, about 100,000 requests per day | 50 outbound calls per request and a small worker size limit (see below) |
| Legal database | OpenLegal / CaseWin | Unknown, read their terms | Check pricing, limits and permitted use before building on it |
| Document files | Not needed | Files are read in the browser | Firebase Storage needs a paid plan now, so it is not used |

## Steps, with the free tool for each

1. **Create accounts** (all free): GitHub, Cloudflare, Firebase (Google account), Google AI Studio.
2. **Open the project in GitHub Codespaces.** Create a private repo, upload the zip contents, click Code > Codespaces > Create. You get a full terminal in your browser.
3. **Firebase (Spark plan only).** Do not click Upgrade. Enable Email/Password and Google sign-in, create Firestore in production mode, publish `firestore.rules`, copy the 4 web config values, add your user ID to an `admins` collection.
4. **AI key.** In Google AI Studio create an API key. Put it in `.dev.vars` as `AI_API_KEY`.
5. **Run it.** `npm install`, then `npm run dev`. Codespaces gives you a forwarded URL to open on your phone.
6. **Deploy on Cloudflare.** `npx wrangler login`, add secrets with `npx wrangler secret put`, then `npm run deploy`. You get a free `*.workers.dev` address.
7. **Authorize the domain.** Firebase > Authentication > Settings > Authorized domains > add your `workers.dev` address.
8. **Connect OpenLegal** once you have read its docs (see README step 4).

## Free plan limits that can bite, and the fix

- **Cloudflare worker size.** Next.js apps can exceed the free plan's size limit. If `npm run deploy` fails with a size error, the options are: the paid Workers plan (a few dollars a month), or deploy the same code to Vercel's free Hobby plan (its terms limit it to non-commercial use, which fits a student project). The code runs on Vercel unchanged, you only skip the OpenNext step.
- **Gemini free rate limit.** Each answer makes several AI calls. Standard research is usually fine. If you see "rate limiting" messages, wait a minute, use Quick Research, or spread requests out.
- **Firestore daily reads.** About 50,000 per day shared by all users. Fine for you and a class. For hundreds of daily users, plan an upgrade or a vector index.
- **Cloudflare outbound calls.** 50 per request. This is why research depth has a call budget in `src/lib/config.ts`.

## What not to pay for yet
Domain name, Firebase Blaze plan, Cloudflare paid plan, any paid legal database. Add them only after real students use the app and you hit a real limit.
