# Recap notes format

`npm run recap` turns a notes file like this, a folder of photos and an event into a **draft** recap post in Sanity. A person reviews and publishes it in Studio. The command never publishes.

```sh
npm run recap -- --event <slug|YYYY-MM-DD|"title words"> --photos <dir> --notes <file.md> [--dry-run] [--replace]
```

In a Claude Code session, `/recap` does the same thing and writes the notes file for you from the organizer's loose notes (`.claude/commands/recap.md`).

## The notes file

```markdown
---
title: October workshop: what we built
excerpt: Forty people spent a Thursday morning wiring models into real tools.
---

## The talks

Ana Ruiz showed three retrieval demos built on [her repo](https://example.org/repo).

- Retrieval over meeting notes
- A support triage bot

## What people asked

Most questions were about **cost**.

> Start with the boring problem. It pays for the fun one.
— Ana Ruiz, Staff Engineer, Acme

> Ship it on Friday.
— Ben Ode
```

- **Front matter** (optional): `title` and `excerpt`, one line each. Without a title the post is called "Recap: <event title>". Without an excerpt it is `[excerpt]`.
- **`## ` headings** start the write-up sections. Each becomes a write-up section (`cle-recap-writeup`) with the heading as an H2. Text before the first heading becomes a section with no heading. With no write-up at all, the draft gets one placeholder section.
- **Paragraphs** are separated by a blank line. `- ` lines are bullets. Inline `**bold**`, `*italic*` and `[text](url)` links carry over. Nothing else in Markdown is converted.
- **Quotes**: one or more `> ` lines, then `— Name, Title` (an em dash, an en dash or `--`) on the next non-blank line. Everything after the first comma is the title, so "Staff Engineer, Acme" stays whole.
  - **Quotes are separated by a blank line** (or an empty `>` line). Consecutive `> ` lines are one quote, so two speakers' words on consecutive `> ` lines become one quote credited to the second speaker.
  - No `—` line: `citeName` is `[speaker]` and `citeTitle` is `[title]`.
  - A name with no title: `citeTitle` is `[title]`.
  - Quotes go after the photos, wherever they appear in the file, as in Studio's "Event recap" starter.

## What the draft contains

- `_id`: `drafts.recap-<event slug>`, so each event has at most one recap draft. The slug is `recap-<event slug>`.
- `kind: "recap"`, `event` linked to the event, and `publishedAt` set to the time of the run. `publishOn` is left empty.
- The body has the shape of Studio's "Event recap" starter, in this order:
  1. the write-up sections;
  2. a gallery section (`cle-recap-gallery`) with the heading "Photos" and one image per photo, in file-name order, each with alt text `[describe this photo]`;
  3. the quotes.
- Photos: JPEG, PNG, WebP or GIF. Other files in the folder are skipped and listed. Each photo is turned upright, resized to at most 2400px wide and stripped of its EXIF data (camera GPS included) before upload.
- Every `[bracket]` is for the reviewer to fill in or delete before publishing.

## Picking the event

`--event` takes one of:

- the event's slug, matched exactly;
- a date, `YYYY-MM-DD`, matched against the event's start day in New York time;
- words from the title, case-insensitive, all of which must appear.

No match, or more than one, stops the command. A multiple match lists each event's date, title and slug, so you can pass the slug instead.

## Safety rules

- The command only writes documents whose id starts with `drafts.`.
- If `recap-<event slug>` is already published, it stops. Edit the published post in Studio instead.
- If the draft already exists, it stops unless you pass `--replace`.
- If any published recap post already links to the event (under any id), it stops and names that post.
- `--replace` overwrites only the draft revision it checked. If someone edits the draft in Studio in the meantime, the save fails instead of overwriting their edit.
- These checks run before any photo is uploaded, and again when the draft is saved.
- **Photos are public as soon as they upload.** Sanity assets aren't drafts: each uploaded photo has a public CDN URL straight away, before anyone reviews the post. Don't put a photo in the folder that shouldn't be public.
- If the save fails after the uploads (a network error, or the draft changed between the check and the save), the uploaded photos stay in Sanity as unused assets. Running the command again usually reuses them, because Sanity dedupes identical files. Otherwise delete them with the Sanity CLI (`npx sanity documents delete <asset id>`); the Studio here has no media browser.
- `--dry-run` reads the events, opens every photo and prints the draft as JSON. It uploads nothing and saves nothing.
- `CONTENT_SOURCE=fixtures` reads events from `tests/fixtures/dataset.ndjson` and allows `--dry-run` only.

## The token

Put the token in `.env.local` as `SANITY_API_WRITE_TOKEN`, next to `SANITY_PROJECT_ID` and `SANITY_DATASET`. The script never prints it.

**Sanity Free has no role that can draft without publishing.** I checked on Nov 4, 2026:

- Sanity's roles documentation (https://www.sanity.io/docs/content-lake/roles-concepts) lists the Free plan's member roles as Administrator and Viewer.
  - Contributor, the role with "read and write access to draft content", is a Growth plan role.
  - API tokens come in two kinds: Editor (read+write) and Viewer (read-only).
- The pricing page (https://www.sanity.io/pricing) says Free comes with "access to the Administrator and Viewer roles". It marks Contributor as not included on Free.
- Custom roles are Enterprise only.

So the token is an **Editor** token. It can technically publish, and it can write any document. The drafts-only rule is enforced by the script: `pushDraft` refuses any id outside `drafts.` and any id that is already published. Anyone holding the token can get around that by calling Sanity directly. Treat the token like a password, keep it out of the repo, and give it only to people who could publish anyway. If the project moves to Growth, check whether a token can be given the Contributor role. If it can, use that token here instead. The script doesn't need to change.

To make the token: sanity.io/manage → the project → API → Tokens → Add API token, permission **Editor**.
