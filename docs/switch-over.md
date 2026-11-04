# Switch-over runbook

Every step here is Ted's. Claude does none of them. Nothing in this runbook touches the DNS mail records (MX, SPF, DKIM, DMARC): info@cle-ai.com is hosted at Hostinger and must keep working. Environment variables are listed in `.env.example`; real values go only into Vercel's settings and `.env.local`, never into git.

## Before you start: decisions and checks

1. **Sanity dataset visibility (read this first).** Form submissions (`submission.<uuid>`) and the Meetup refresh token (`secrets.meetupSync`) are stored in the dataset under ids that contain a dot. Everything the public site shows has an id without a dot (`page-about`, `post-<slug>`, `event-<meetup id>`, `person-<slug>`, `category-<slug>`, or a Studio-made id), because the site reads Sanity without a token. Sanity's documentation says: any document id containing a dot is private and needs a token with read permission, even when the dataset is public; only ids without a dot are readable without authentication. So both are protected by the id scheme. Private datasets are a paid-plan feature and are not available on Sanity Free (Sanity's datasets page: they require a Growth plan), so do not count on a private dataset.
   What to check: after step 4, run these without any token (replace `<projectId>`). The first two must return an empty `result`:
   ```sh
   curl -s 'https://<projectId>.api.sanity.io/v2025-01-01/data/query/production?query=*%5B_type%3D%3D%22submission%22%5D'
   curl -s 'https://<projectId>.api.sanity.io/v2025-01-01/data/query/production?query=*%5B_id%20in%20path(%22secrets.**%22)%5D'
   ```
   If anything comes back, stop, rotate the Meetup refresh token, and do not launch the forms.
   The other half: content must be readable without a token. These must each return a document id with no dot (for example `"result":"page-about"`), not `null`:
   ```sh
   curl -s 'https://<projectId>.api.sanity.io/v2025-01-01/data/query/production?query=*%5B_type%3D%3D%22page%22%5D%5B0%5D._id'
   curl -s 'https://<projectId>.api.sanity.io/v2025-01-01/data/query/production?query=*%5B_type%3D%3D%22post%22%5D%5B0%5D._id'
   curl -s 'https://<projectId>.api.sanity.io/v2025-01-01/data/query/production?query=*%5B_type%3D%3D%22event%22%5D%5B0%5D._id'
   ```
   If one returns `null` while Studio shows that content, the public site would be empty: stop and do not move DNS. Studio and Presentation are signed in, so they look fine either way; only these anonymous queries show the problem. Keep the project's API tokens private and never add a token to a `NEXT_PUBLIC_` variable.
2. **GitHub repo visibility.** Vercel Hobby cannot deploy a private repo owned by an organization. Make `Cleveland-AI/cle-ai-website` public (nothing secret is in it), or move it to a personal account.
3. **Privacy policy.** It stays a draft awaiting board and counsel review (Review status "Draft, awaiting counsel"). Its analytics paragraph is still in brackets. Don't edit its wording, and decide with the board whether it goes live in this state. It is imported as an unpublished draft, so it will not be public until someone publishes it in Studio.

## Steps

### 1. Create the accounts (all free plans)

- Vercel Hobby, Sanity Free, Resend Free (3,000 emails a month), Cloudflare Turnstile (free).
- In Sanity create a project and a dataset called `production`. Note the project id.
- In Turnstile create a widget for `cle-ai.com` and `www.cle-ai.com` (add preview hostnames only if you test forms on previews). Note the site key and secret key.
- In Resend create an API key (sending access). The domain comes in step 6.

### 2. Make the GitHub repo public

Or move it to a personal account (see decision 2 above).

### 3. Import into Vercel and set the environment variables

Import the repo and set every variable in `.env.example` that applies to production:

- Sanity: `SANITY_PROJECT_ID`, `SANITY_DATASET`, `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`.
- Tokens, created in Sanity (Manage, API, Tokens): `SANITY_API_WRITE_TOKEN` (Editor), `SANITY_API_DRAFTS_TOKEN` (Viewer, for Studio previews). `SANITY_API_READ_TOKEN` is optional.
- `SANITY_REVALIDATE_SECRET`: a long random string you make up; the same value goes into the webhook below.
- `RESEND_API_KEY`, `FORMS_TO` (info@cle-ai.com), `FORMS_FROM` (an address on cle-ai.com, such as `CLE AI & DATA <forms@cle-ai.com>`).
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_HOSTNAMES` (see the checklist).
- `MEETUP_CLIENT_ID`, `MEETUP_CLIENT_SECRET` (step 5), `MEETUP_GROUP_URLNAME` (`cleveland-ai-data`).
- `CRON_SECRET`: a long random string. Vercel Cron sends it to the sync route as a Bearer token.
- `NEXT_PUBLIC_SITE_URL=https://cle-ai.com` and `CONTENT_SOURCE=sanity`. Never set `CONTENT_SOURCE=fixtures` on Vercel.
- Leave `CSP_MODE` unset for now (see the checklist).

Then in Sanity:

- **Webhook** (Manage, API, Webhooks): URL `https://<your domain>/api/revalidate`, POST, dataset `production`, trigger on create, update and delete, leave the projection empty, and the same secret as `SANITY_REVALIDATE_SECRET`. The route checks Sanity's signature and refuses everything if the secret is missing. Set the webhook's **Filter** to this, so form submissions, the daily Meetup token write, drafts and bare image uploads don't empty the whole site cache:
  ```groq
  !(_type in ["submission", "meetupSyncState", "sanity.imageAsset", "sanity.fileAsset"]) && !(_id in path("drafts.**")) && !(_id in path("secrets.**")) && !(_id in path("submission.**"))
  ```
  In the advanced settings, leave the option to trigger on drafts off. The route also ignores those documents if one gets through.
- **CORS origins** (Manage, API, CORS origins): add the production domain (`https://cle-ai.com`, and `https://www.cle-ai.com` if used) and the Vercel preview domain you test on (for example `https://<project>-*.vercel.app`, or each preview URL), with credentials allowed. Studio at `/studio` needs them to load.
- Invite the team to the project (Sanity Free has a user limit; check it).

### 4. Migrate the content

1. In WordPress create an application password for an administrator (Users, Profile, Application Passwords).
2. In `.env.local` set `WP_BASE`, `WP_APP_USER`, `WP_APP_PASSWORD`, plus the Sanity project id and dataset.
3. Run the migration into an import file, with media in import mode:
   ```sh
   npm run migrate -- --from "$WP_BASE" --out out/production.ndjson --media-mode import --media-dir out/media
   ```
   It also writes `src/lib/redirects/generated.json` (the old-URL redirect table). Commit that file and deploy it.
4. Import into the production dataset (this is the one step that writes real content; use a clean dataset):
   ```sh
   npx sanity dataset import out/production.ndjson production
   ```
   The privacy page arrives as an unpublished draft.
5. Run the curl checks from decision 1: the two private ones return nothing, and the three content ones each return a dot-free id.
6. Open `/studio`, look over the pages, publish what should be public, and check that the events (the 26 event posts on the live site as of Nov 3, 2026) and the redirects came across.

### 5. Authorize Meetup and save the refresh token

1. Use the Meetup OAuth consumer you already have (the one created for the WordPress import plugin). Authorize it against your Meetup account (OAuth authorization-code flow) to get a refresh token, and put `MEETUP_CLIENT_ID`, `MEETUP_CLIENT_SECRET` and `MEETUP_REFRESH_TOKEN` in Vercel.
2. Trigger the first sync by hand after the first deploy (Vercel project, Settings, Cron Jobs, Run; or `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/meetup-sync`). The cron then runs daily at 23:10 UTC (`vercel.json`).
3. **Live check of the GraphQL response shape.** The sync was written against Meetup's documented shape and has been tested only with fakes. On the first run read the JSON answer: `source` should be `graphql`, `fetched` should match the group's events, and the counts should make sense; then look at a few events in Studio (title, times, venue, RSVP link). The iCal feed is a fallback only, used when the API fails, and it fills fewer fields; if `source` says `ical`, find out why GraphQL failed.
4. **Token rotation risk.** Meetup rotates the refresh token on each refresh. The new one is stored in Sanity (`secrets.meetupSync`) and wins over the environment variable. If that store write ever fails, the rotated token is lost and the old one stops working: the sync then fails with a credentials error. Fix: authorize again and set a fresh `MEETUP_REFRESH_TOKEN` in Vercel (and delete the stale `secrets.meetupSync` document if one exists, since a stored token wins).

### 6. Hostinger DNS: Resend's records and the website records

1. **Back up the DNS zone first** (export or screenshot every record in Hostinger's DNS editor) and keep the backup.
2. **Resend:** in Resend add your domain (`cle-ai.com`), copy the records it gives you and add them in the Hostinger zone. These are extra records Resend names (typically DKIM keys and a `send` subdomain's MX and SPF entries). Add them alongside what is there; don't edit or remove any existing MX, SPF, DKIM or DMARC record at the root. Wait for Resend to say the domain is verified, then send a test form submission and check it arrives. Send from an address on the verified domain (`FORMS_FROM`).
3. **Website:** add `cle-ai.com` and `www.cle-ai.com` in Vercel (Settings, Domains); Vercel shows exactly what to set. Change only the website's A record (root) and `www` CNAME to Vercel's values. Leave every MX record, the SPF record for Hostinger mail, DKIM and DMARC as they are.
4. Check info@cle-ai.com still receives mail right after the change.

### 7. Newsletter subscribers

Export the Newsletter plugin's subscribers from WordPress and import them into Substack. Every signup on the new site is the Substack embed, and `/newsletter` redirects to Substack.

### 8. Check Poptin and Givebutter

- Poptin: the pixel loads on every page. Confirm your popups show in Poptin's dashboard and on the live site.
- Givebutter: the donation embed and gift slider work, including Apple Pay and Google Pay.

### 9. Keep WordPress, then cancel

Leave WordPress on Hostinger, unlinked, for a few weeks as a fallback, then cancel it.

## Launch checklist

- [ ] Dataset visibility checked (decision 1): the two private queries return nothing, and the anonymous page, post and event queries each return a dot-free id.
- [ ] `src/lib/redirects/generated.json` regenerated by step 4.3 and committed: no `to` contains `cleaiplaceholder` (`grep -c cleaiplaceholder src/lib/redirects/generated.json` prints 0). The unit tests fail on it once `SANITY_PROJECT_ID` is set to the real project.
- [ ] `SANITY_API_WRITE_TOKEN` is set in production. If it is missing, the server only logs an error: forms still email but no copy is saved in Sanity, and the Meetup cron refuses to run (it answers 503).
- [ ] `TURNSTILE_HOSTNAMES` includes the Vercel preview hosts if you test the forms on previews (comma-separated). The default is `cle-ai.com,www.cle-ai.com`. A submission from a host not listed fails the spam check.
- [ ] Resend domain verified, `FORMS_FROM` on cle-ai.com, a test submission received at info@cle-ai.com and saved under Form submissions in Studio.
- [ ] Meetup first sync checked (step 5); the refresh-token risk understood.
- [ ] Sanity webhook and Studio CORS origins set for production and preview domains.
- [ ] Old URLs: spot-check a few (`/index.php/...`, `/index.php/meetup-event/...`, a `/wp-content/uploads/...` file, a category, `/feed/`) all land on the right new page in one hop.
- [ ] **CSP.** The site ships a minimal enforced policy (`frame-ancestors 'self'; object-src 'none'; base-uri 'self'`) and the full policy as Report-Only, so it blocks nothing. Switch to enforcing (`CSP_MODE=enforce`, build and runtime environment, then redeploy) only after a Vercel preview that loads the real Poptin pixel, plus the Givebutter and Substack embeds, shows zero violations in the browser console. If anything is reported, add the host to `src/lib/security-headers.ts` first. The Studio has its own lighter headers.
- [ ] The recap token: Sanity Free has no role that can only write drafts, so the recap command's token is an Editor token (it could publish if misused). The command itself only writes ids that start with `drafts.` and refuses to touch a published recap (see `docs/recap-notes-format.md`). Keep that token on the people who run the command, never in Vercel unless it is the same write token you already use there, and rotate it if it leaks.
- [ ] Privacy policy still a draft awaiting board and counsel review; its analytics passage is still bracketed. Nobody writes new legal wording.

## Known notes and later improvements

- **Search is cached per query.** Each distinct search (terms and page) is cached for 5 minutes like every other query, so repeating a search costs nothing, but every new search string is one Sanity request and one cache entry (Next's in-memory cache is bounded, so old entries drop out). If traffic grows, add a rate limit at the edge.
- **Scheduled posts and Sanity's API CDN.** A post with a future Publish on appears when `now()` in the query passes that time. The public client reads Sanity's API CDN, which may keep an answer computed with an earlier `now()` until something is published. Check it on the first scheduled post: if it shows up late, pass the time as a parameter rounded to 5 minutes instead of `now()` (`src/lib/content/filters.ts`).
- **Failed form emails.** A submission whose email failed is still saved and the visitor sees success. Once a week, open Form submissions in Studio and look for any with Email status "failed" (or run `*[_type == "submission" && emailStatus == "failed"]` in Vision), and answer them by hand.
- **Unknown pages without JavaScript.** `/no-such-page`, `/blog/no-such-post` and `/events/no-such-event` return a correct 404 status, but the body is Next's empty error shell until JavaScript runs, so a visitor without JavaScript sees a blank page (a URL that matches no route at all, such as `/a/b/c`, shows the full "Dot can't find that page" page). It is not fixed because the clean fix is a slug check in the proxy, which runs on every request: it would need its own cached list of every page, post and event slug, a bypass for Studio previews of unpublished pages, and a fail-open path, and a mistake there would 404 real pages. Search engines get the right status; revisit after launch.
- **Vercel Hobby terms.** Vercel's Hobby plan is for personal, non-commercial use. Decide knowingly whether a 501(c)(3)'s site fits that, or move to Pro.
- **Proxy redirect refresh.** The proxy refreshes the people-added redirects in the background without waiting for it. On serverless that can be cut off early; consider Vercel's `waitUntil` for it. Note only, nothing is broken today.
- **npm audit.** `npm audit --omit=dev` on Nov 4, 2026 reports 17 vulnerabilities (14 moderate, 3 high). All trace to the `sanity` package's own command-line and build tooling (js-yaml, smol-toml and undici inside the Sanity CLI and Vercel-frameworks dependencies, plus minimatch and a few packages that depend on them). `npm audit` offers only `npm audit fix --force`, which would install `sanity@5.14.1`, a downgrade across a major version, so it was not applied. They are not in the code the public site runs on Vercel; Studio is the `sanity` package, and it is served at `/studio` from this same app, so it does ship with the site; the vulnerable packages appear to be the CLI and build tooling rather than the Studio's browser code, but that has not been verified. Re-run the audit before launch and take Sanity's next release when it fixes them.
- **Sanity Free limits.** Users, documents and API requests are limited on Free; check the usage page after the import.
