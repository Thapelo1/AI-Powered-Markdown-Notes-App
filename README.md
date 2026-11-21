# Margin — AI Markdown Notes

Margin is a React app for writing one Markdown note per account and asking an AI assistant to summarize or rewrite it. Supabase Auth identifies the account, Supabase Postgres stores its note, and the Node server verifies sign-in before calling OpenAI.

## Requirements

- Node.js 22 or newer
- A Supabase project with email/password authentication enabled
- An OpenAI API key

## Configure Supabase

1. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates the `notes` table, limits note length to 20,000 characters, and enables row-level security so a signed-in user can access only their own row.
2. In Authentication settings, enable email/password sign-in. Set the site's URL and allowed redirect URLs for your local and deployed app. Email confirmation is controlled by your Supabase project's Auth settings.
3. Copy `.env.example` to `.env`. Add your OpenAI API key. The Supabase URL and publishable key are prefilled for this project; keep each server/browser pair identical.

The browser uses the public publishable key; row-level security protects note data. Never put a Supabase secret/service-role key or OpenAI API key in the browser or commit them to source control.
Notes are stored by Supabase; their text is sent to OpenAI only when a user chooses Rewrite or Summarize.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal. The Vite development server proxies `/api` requests to the Node server on port 3001. Create an account with the email/password form; if email confirmation is on, confirm the email before signing in.

## Build and run

```sh
npm run build
npm start
```

The Node server serves the built app and API from the same origin. Set `PORT` if the hosting platform supplies a port. Configure the same environment variables in the hosting platform; `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are embedded during the build, so changing them requires rebuilding the frontend.

For a public deployment, use HTTPS, configure Supabase's production site/redirect URLs, and configure production email delivery in Supabase Auth. The AI API is limited to 20 requests per account per 15 minutes. Its limiter is in memory and resets when the process restarts; use a shared rate-limit store before running multiple server instances.

## CI and Render deployment

The GitHub Actions workflow runs `npm ci`, audits dependencies, and builds the app for pull requests and pushes to `main`. A successful push to `main` triggers a Render deploy hook; deployment is serialized and does not run for pull requests.

To enable deployment:

1. Create a Render **Web Service** for this repository using Node.js 22, build command `npm ci && npm run build`, and start command `npm start`. Set the health check path to `/healthz` and disable Render's automatic deploys so deployments remain gated by CI.
2. Configure `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Render service. The health check stays unhealthy until the server-side Supabase and OpenAI credentials are present.
3. Create a GitHub **production** environment and add its `RENDER_DEPLOY_HOOK_URL` secret using the deploy hook from the Render service. Optionally require reviewers for this environment to add a manual production approval.

The workflow currently has no application test or lint commands to run; add them when the project adopts those checks.

## How it fits together

- `src/App.jsx` composes the authentication and note workspace views.
- `src/features/auth/` owns sign-in/sign-up UI and Supabase session lifecycle.
- `src/features/notes/` owns account note loading, autosave/import, and AI actions.
- `src/lib/supabase.js` creates the shared browser client and exports app limits.
- `supabase/schema.sql` defines the per-account note and the database row-level security rules. The browser talks to Supabase directly; those policies, not a browser-supplied user ID, enforce note ownership.
- `server.js` configures Express and external clients; `server/middleware/` verifies user sessions; `server/routes/` validates and limits AI requests.
- `src/styles.css` contains the responsive interface styles; `src/main.jsx` mounts the React app.

The app intentionally keeps the existing one-note-per-account interface; it does not include note history, sharing, account administration, or billing. A pre-existing `margin-note` browser draft is offered for explicit import after sign-in when the account has no saved note.
