// npm run recap -- --event <slug|YYYY-MM-DD|"title words"> --photos <dir> --notes <file.md> [--dry-run] [--replace]
//
// Drafts an event recap post into Sanity, as a draft only, for a person to review and publish in
// Studio. The notes format is docs/recap-notes-format.md; the Claude Code command that writes the
// notes from an organizer's loose notes is .claude/commands/recap.md.
//
// Needs SANITY_API_WRITE_TOKEN (and the project id and dataset) in .env.local, except with
// --dry-run, which reads events but uploads and writes nothing and prints the draft as JSON.
// CONTENT_SOURCE=fixtures reads events from tests/fixtures/dataset.ndjson and allows --dry-run only.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { createClient } from "@sanity/client";
import type { EventDoc } from "../../src/lib/events/time";
import { buildRecapDraft, findRecapEvent, parseNotes } from "./notes";
import { checkDraftSlot, fromSanityClient, listPhotos, loadEvents, pushDraft, resizePhoto, uploadPhotos, type RecapClient } from "./push";

const SITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const USAGE = `Usage: npm run recap -- --event <slug|YYYY-MM-DD|"title words"> --photos <dir> --notes <file.md> [--dry-run] [--replace]`;

export type RunDeps = {
  /** The Sanity client; built from the environment when absent. */
  client?: RecapClient;
  /** Events to pick from instead of asking Sanity (fixtures mode). */
  events?: EventDoc[];
  log?: (s: string) => void;
  error?: (s: string) => void;
  siteUrl?: string;
  now?: Date;
};

/** Where the draft opens in the embedded Studio (desk structure path for the default post list). */
export function studioLink(draftId: string, site: string): string {
  return `${site.replace(/\/+$/, "")}/studio/structure/post;${draftId.replace(/^drafts\./, "")}`;
}

const defaultSiteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function fixtureEvents(): EventDoc[] {
  return readFileSync(join(SITE_DIR, "tests/fixtures/dataset.ndjson"), "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as EventDoc & { _type: string })
    .filter((d) => d._type === "event");
}

/** Builds the client from the environment. Throws (naming the missing variable, never a value) when it can't. */
async function envClient(write: boolean): Promise<RecapClient> {
  const { apiVersion, PLACEHOLDER_PROJECT_ID } = await import("../../src/sanity/env");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";
  if (!projectId || projectId === PLACEHOLDER_PROJECT_ID) throw new Error("Set SANITY_PROJECT_ID (and SANITY_DATASET) in .env.local.");
  const token = process.env.SANITY_API_WRITE_TOKEN || (write ? undefined : process.env.SANITY_API_READ_TOKEN);
  if (write && !token) throw new Error("Set SANITY_API_WRITE_TOKEN in .env.local (or use --dry-run).");
  return fromSanityClient(createClient({ projectId, dataset, apiVersion, token, useCdn: false, perspective: "raw" }));
}

/** Runs the command; returns the exit code. */
export async function run(argv: string[], deps: RunDeps = {}): Promise<number> {
  const log = deps.log ?? ((s: string) => console.log(s));
  const error = deps.error ?? ((s: string) => console.error(s));
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        event: { type: "string" },
        photos: { type: "string" },
        notes: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        replace: { type: "boolean", default: false },
        help: { type: "boolean", default: false },
      },
      strict: true,
    });
    if (values.help) {
      log(USAGE);
      return 0;
    }
    if (!values.event || !values.photos || !values.notes) throw new Error(`--event, --photos and --notes are all required.\n${USAGE}`);
    const dryRun = values["dry-run"];
    if (!existsSync(values.notes)) throw new Error(`Notes file not found: ${values.notes}`);
    if (!existsSync(values.photos) || !statSync(values.photos).isDirectory()) throw new Error(`Photos folder not found: ${values.photos}`);

    const fixtures = !deps.client && !deps.events && process.env.CONTENT_SOURCE === "fixtures";
    if (fixtures && !dryRun) throw new Error("CONTENT_SOURCE=fixtures has no Sanity to write to; use --dry-run.");
    const events = deps.events ?? (fixtures ? fixtureEvents() : undefined);
    let client = deps.client;
    const getClient = async () => (client ??= await envClient(!dryRun));

    // Everything that can fail cheaply fails before any upload.
    const event = findRecapEvent(values.event, events ?? (await loadEvents(await getClient())));
    const notes = parseNotes(readFileSync(values.notes, "utf8"));
    const { photos, skipped } = listPhotos(values.photos);
    if (skipped.length) log(`Skipping files that aren't JPEG, PNG, WebP or GIF: ${skipped.join(", ")}`);
    log(`Event: ${event.title} (${event.slug?.current ?? event._id})`);
    log(`Notes: ${notes.sections.length} section(s), ${notes.quotes.length} quote(s). Photos: ${photos.length}.`);

    if (dryRun) {
      // Opens and resizes each photo so a bad file shows up now, but uploads nothing.
      for (const p of photos) await resizePhoto(readFileSync(p), p);
      const draft = buildRecapDraft(event, notes, photos.map((p) => `dry-run:${p.split(/[\\/]/).pop()}`), deps.now);
      log(JSON.stringify(draft, null, 2));
      log("Dry run: nothing was uploaded or saved.");
      return 0;
    }

    const c = await getClient();
    // The save checks run before the uploads too, so a refused draft doesn't leave orphan assets.
    await checkDraftSlot(buildRecapDraft(event, notes, [], deps.now), c, { replace: values.replace });

    log("Uploading photos (resized to at most 2400px wide)...");
    const assetIds = await uploadPhotos(photos, c, log);
    const draft = buildRecapDraft(event, notes, assetIds, deps.now);
    await pushDraft(draft, c, { replace: values.replace });
    log(`Saved draft ${draft._id}. Nothing is published: review and publish it in Studio:`);
    log(studioLink(draft._id, deps.siteUrl ?? defaultSiteUrl()));
    return 0;
  } catch (e) {
    error(e instanceof Error ? e.message : String(e));
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const envFile = join(SITE_DIR, ".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  run(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
