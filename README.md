# CLE AI & DATA website

The cle-ai.com site: a Next.js app with its content in Sanity, hosted on Vercel. The team edits in Sanity Studio at `/studio`; developers work in this repo.

- Putting the site live (Ted's checklist): [docs/switch-over.md](docs/switch-over.md)
- Drafting event recaps with the recap command: [docs/recap-notes-format.md](docs/recap-notes-format.md)

## For the team: editing in Studio

Open `https://cle-ai.com/studio` and sign in with the account Ted invited. Everything you change is a draft until you press **Publish**. Published changes show on the site within about five minutes (usually sooner, when the publish webhook is set up).

### Posts and the four templates

Choose **New post** and pick a starter. Each one pre-fills the post "Kind" and a starting body. Text in `[square brackets]` is a placeholder: replace it or delete it before publishing.

- **Event recap**: a write-up section, a photo gallery section and speaker quotes (each quote has the speaker's name and title).
- **Newsletter issue**: "This month" and "Coming up" headings to fill in.
- **Article**: a blank body.
- **Announcement**: a body plus a buttons block.

Fill in the title, author, categories, featured image and excerpt. Use the **Presentation** tool (the preview tab in Studio) to see how a draft will look before you publish.

### Scheduling a post: "Publish on"

A post has a **Publish on** date and time. Leave it empty and the post appears as soon as you publish it. Set a future time and the post stays hidden from the site, the sitemap, the RSS feed and search until then, even though it is published in Studio. After that time it appears within about five minutes. Sanity's own paid scheduling is not used.

### The team

The team cards come from **Person** documents. Open **Person** in Studio and edit someone's name, role, **Leadership** box, bio, photo, links and **Order** (the number that sorts the list). Tick **Hide from the team list** to take someone off the page without deleting them. Person documents are also the post authors.

The Team block on the About page also has its own optional members list. If you fill that in, it replaces the Person documents on that page entirely, so leave it empty unless you want a one-off list.

### Sponsors

Sponsor tiers and perks are in the **Sponsorship builder** block on the Sponsors page (tier names, minimum amounts, prices, and each perk's label, description and weight). Only name a sponsor once they have signed.

### The homepage chapters

Open **Homepage** at the top of Studio. The story is a list of chapters, and Studio has two chapter blocks with different fields:

- **World chapter**: **Camera** (X, Y and zoom, which decide where the story world is framed), **Hotspots** (the markers a visitor can open), **Tag** (with phone and short versions) and **Stop** (where the chapter's label and stopping point sit), plus **Fade below**.
- **Story chapter**: **Camera**, **Hotspots**, **Bubbles** (speech bubbles, each with a position and text), **Pin**, and its title, icon and layers.

Positions are percentages across the scene. Change one number at a time and check the Presentation preview.

### Events and event notes

Events come from Meetup once a day. The sync owns the title, time, venue, description and RSVP link, and overwrites them on each run, so make those changes on Meetup. Fields you add in Studio are kept: **Notes** and **Extra photos** on an event.

### Other things you can edit

- **Site settings**: the announcement bar, the 501(c)(3)/EIN line, and the Substack, Givebutter and Poptin settings.
- **Form submissions**: a saved copy of every "Pitch a talk" and "Sponsor inquiry" (the email to info@cle-ai.com is the main copy). These are personal data, so treat them accordingly.
- **Pages**: the privacy policy is a draft awaiting board and counsel review (see its Review status); don't change its wording.

## The recap command

Instead of writing a recap from scratch, you can have an agent draft it from the organizer's notes and a folder of photos. It saves a **draft only**; a person reviews and publishes it in Studio.

Run both from the repo root, the folder that contains `package.json` and `.claude/`.

- In a Claude Code session started there: `/recap <event> <photos folder> <notes>`.
- Without an agent: `npm run recap -- --event <slug|YYYY-MM-DD|"title words"> --photos <dir> --notes <file.md> [--dry-run] [--replace]`.

It needs `SANITY_PROJECT_ID`, `SANITY_DATASET` and `SANITY_API_WRITE_TOKEN` in `.env.local`. Photos become public on Sanity's CDN as soon as they upload, so only use photos that may be public. The notes format, the photo rules and what the draft contains are in [docs/recap-notes-format.md](docs/recap-notes-format.md). Missing facts stay as `[brackets]` for the reviewer; the command never invents quotes or numbers.

## For developers

### Running locally

```sh
cp .env.example .env.local   # then fill in what you need
npm install
npm run dev                  # http://localhost:3000, Studio at /studio
```

With no Sanity project set, the app uses a placeholder project id so it builds and tests without an account. To run against the test content in `tests/fixtures/dataset.ndjson` and no network, set `CONTENT_SOURCE=fixtures` in `.env.local` (never on Vercel).

### Checks

```sh
npm run check
```

Runs the type check, lint, unit tests (Vitest), a build against the fixtures, and the end-to-end tests (Playwright). It must be green before a change merges. Also available: `npm run typecheck`, `lint`, `test`, `e2e`, and `npm run visual` (look comparison against a local WordPress test site; needs Docker and is not part of `check`).

### Other scripts

- `npm run migrate`: copies the WordPress site into an NDJSON file for `sanity dataset import` (see the switch-over runbook).
- `npm run typegen`: regenerates the Sanity types after a schema change.
- `npm run team-photos`, `npm run tokens`: regenerate the team photo hashes and the design tokens.

### How it fits together

- Content is read from Sanity and cached; the Sanity publish webhook calls `/api/revalidate` to refresh it.
- Old WordPress addresses redirect permanently (308) to the new ones (`src/proxy.ts`, `src/lib/redirects/`); people can also add `redirect` documents in Studio.
- Vercel Cron calls `/api/cron/meetup-sync` daily at 23:10 UTC (`vercel.json`).
- Forms are checked on the server (honeypot plus Turnstile), emailed through Resend and saved in Sanity.
- Security headers live in `src/lib/security-headers.ts`.
- Environment variables: see `.env.example`.
