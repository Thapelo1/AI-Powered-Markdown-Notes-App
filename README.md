# Margin — AI Markdown Notes

Margin is a React app for writing one Markdown note per account. Supabase Auth identifies the account and Supabase Postgres stores its note. Rewrite and Summarize send the current note to OpenAI when selected and may incur API charges.

## Requirements

- Node.js 22 or newer
- A Supabase project with email/password authentication enabled

## Configure Supabase

1. For a new Supabase project, run [`supabase/schema.sql`](supabase/schema.sql). It creates the `notes` and `activity_events` tables, limits note length to 20,000 characters, and enables row-level security so signed-in users can access only their own rows. For an existing project, run [`supabase/activity_events.sql`](supabase/activity_events.sql) to add the event table and its access policies.
2. In Authentication settings, enable email/password sign-in. Set the site's URL and allowed redirect URLs for your local and deployed app. Email confirmation is controlled by your Supabase project's Auth settings.
3. Copy `.env.example` to `.env`. The Supabase URL and publishable key are prefilled for this project; keep each server/browser pair identical.

## Configure AI actions

Set `OPENAI_API_KEY` in `.env` for local development and in the server environment for deployment, then restart the server. The key stays on the server and must never use a `VITE_` prefix. `OPENAI_MODEL` is optional and defaults to `gpt-4o-mini`. Each explicit Rewrite or Summarize action sends the current note to OpenAI; API usage may be billed. The original note is not changed.

The browser uses the public publishable key; row-level security protects note data. Never put a Supabase secret/service-role key in the browser or commit it to source control.
Authenticated behavior events (sign-in/out, note load/save/import) are stored in Supabase's `activity_events` table. Inspect them in the Supabase Table Editor or query them in the SQL Editor. Events contain action names and limited metadata only—not note content, passwords, access tokens, or email addresses. Failed sign-ins and sign-ups awaiting email confirmation are not recorded as behavior events.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal. The Vite development server proxies `/api` requests to the Node server on port 3002. Create an account with the email/password form; if email confirmation is on, confirm the email before signing in.

## Build and run

```sh
npm run build
npm start
```

The Node server serves the built app and API from the same origin. Set `PORT` if the hosting platform supplies a port. Configure the same environment variables in the hosting platform; `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are embedded during the build, so changing them requires rebuilding the frontend.

The production build is installable as a PWA and caches the app shell and static assets for repeat visits offline. Sign-in and note loading/saving still require an internet connection to reach Supabase; changes made offline are not saved.

For a public deployment, use HTTPS, configure Supabase's production site/redirect URLs, and configure production email delivery in Supabase Auth. The AI API is limited to 20 requests per account per 15 minutes. Its limiter is in memory and resets when the process restarts; use a shared rate-limit store before running multiple server instances.

## CI and Render deployment

The GitHub Actions workflow runs `npm ci`, audits dependencies, runs tests, and builds the app for pull requests and pushes to `main`. A successful push to `main` triggers a Render deploy hook; deployment is serialized and does not run for pull requests.

To enable deployment:

1. Create a Render **Web Service** for this repository using Node.js 22, build command `npm ci && npm run build`, and start command `npm start`. Set the health check path to `/healthz` and disable Render's automatic deploys so deployments remain gated by CI.
2. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Render service. Set `OPENAI_API_KEY` as a secret to enable AI actions; `OPENAI_MODEL` is optional. The health check stays unhealthy until the Supabase credentials are present.
3. Create a GitHub **production** environment and add `RENDER_DEPLOY_HOOK_URL` as an **Environment secret** in that environment using the deploy hook from the Render service. A repository-level secret with the same name does not satisfy this workflow. Optionally require reviewers for this environment to add a manual production approval.

The workflow runs the Node.js test suite before building; no lint command is configured.

## How it fits together

- `src/App.jsx` composes the authentication and note workspace views.
- `src/features/auth/` owns sign-in/sign-up UI and Supabase session lifecycle.
- `src/features/notes/` owns account note loading and autosave/import.
- `src/lib/supabase.js` creates the shared browser client and exports app limits.
- `supabase/schema.sql` defines the per-account note and the database row-level security rules. The browser talks to Supabase directly; those policies, not a browser-supplied user ID, enforce note ownership.
- `server.js` configures Express; `server/routes/notes.js` verifies the Supabase session and rate-limits OpenAI requests.
- `src/styles.css` contains the responsive interface styles; `src/main.jsx` mounts the React app.

The app intentionally keeps the existing one-note-per-account interface; it does not include note history, sharing, account administration, or in-app billing. OpenAI API usage is billed separately to the configured API account. A pre-existing `margin-note` browser draft is offered for explicit import after sign-in when the account has no saved note.
