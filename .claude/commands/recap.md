---
description: Draft an event recap post into Sanity (draft only) from an organizer's notes and a photo folder
argument-hint: <event slug, date or title words> <photos folder> <notes file, or paste the notes>
---

You are drafting an event recap for cle-ai.com. The result is a **draft** in Sanity. A person reviews and publishes it in Studio. You never publish, and you never write to Sanity any other way than `npm run recap`.

The person's input: $ARGUMENTS

They should give you three things: which event (a slug, a date like 2026-10-22, or words from the title), a folder of photos, and the organizer's notes (a file, or text pasted into the chat). Ask for anything missing. Don't guess.

Read these first:

- `docs/recap-notes-format.md`: the notes format and what the command does.
- `docs/brand-voice.md`: the copy voice (Prompt 1) and the brand facts.

## 1. Find the event

Run a dry run with placeholder notes to check that the event resolves:

```sh
printf '## Placeholder\n\n[notes]\n' > /tmp/recap-probe.md
npm run recap -- --event "<what they said>" --photos <folder> --notes /tmp/recap-probe.md --dry-run
```

- If it names exactly one event, tell the person its title and date and continue.
- If it lists several events, show them the list and ask which one they mean. Then use that event's slug.
- If nothing matches, say so and ask for the slug or the date.

## 2. Write the notes file

Turn the organizer's loose notes into the notes format, in the voice from `docs/brand-voice.md`. Save the file as `recap-notes/<event slug>.md`. Create the folder if it doesn't exist.

- Front matter: a `title` (five to eight words, sentence case) and a one-sentence `excerpt`, both drawn only from the notes.
- Write-up: `## ` sections with short chapter-word headings. Open with the point, then the proof. Use short sentences and no hype words or exclamation points.
- Quotes: copy each quote **word for word** from the notes as `> ` lines. Follow it with `— Name, Title` exactly as the notes give them. Put a blank line between quotes. Consecutive `> ` lines are read as one quote, so two speakers' words would be credited to one person.

The rules that matter most:

- **Never invent** a quote, a name, a title, a number, a company or a sponsor. Use only what the notes say. Don't add facts from memory, from the brand facts, or from the event description unless the notes point to them.
- If something is missing, leave a `[bracket]` placeholder describing it: `[number of attendees]`, `[speaker's title]`, `[what the second talk covered]`.
  - A quote with no speaker gets no `— ` line, and the command marks it `[speaker]`.
  - A speaker with no title gets `— Name` only, and the command marks the title `[title]`.
- Never name a partner organization or sponsor that the notes don't name.
- Don't tidy a quote into better grammar. It is someone's words.

## 3. Show the notes to the person

Show the person the whole notes file and say where you saved it. List every `[bracket]` you left and what each one needs. Ask them to confirm or correct it. Don't go on until they say it's right.

## 4. Save the draft

Run a dry run first, then the real command:

```sh
npm run recap -- --event <slug> --photos <folder> --notes recap-notes/<slug>.md --dry-run
npm run recap -- --event <slug> --photos <folder> --notes recap-notes/<slug>.md
```

- The command uploads the photos (resized to at most 2400px wide), saves `drafts.recap-<slug>`, and prints a Studio link.
- Uploaded photos are public on Sanity's CDN straight away, before the post is reviewed. Before the real run, check with the person that every photo in the folder may be public.
- Report that link to the person. Tell them the draft still needs alt text for each photo (`[describe this photo]`) and any `[brackets]` filled in before they publish.
- If the command says a draft already exists, ask the person before you re-run it with `--replace`. That overwrites the draft, including any edits made in Studio.
- If it says the recap is already published, stop. Tell the person to edit the post in Studio.
- If `SANITY_API_WRITE_TOKEN` or the project id is missing, tell the person to add it to `.env.local`. Never ask for the token's value and never print it.
