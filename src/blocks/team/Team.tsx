import { useId, type CSSProperties } from "react";
import { splitSupports, wrapperProps, type BlockSupports } from "@/blocks/wrapper";
import { getPeople, type PersonDoc } from "@/lib/content/queries";
import { imageUrl } from "@/components/core/Image";
import versions from "./photo-versions.json";
import { TeamList } from "./TeamList.client";

/** One person, from the block's own `members` or from a `person` document. */
export type TeamMember = {
  /** A headshot bundled with the site: the file name in public/assets/team without `.webp`. */
  photo?: string | null;
  /** A Sanity image (a person document's photo). Wins over `photo`. */
  image?: unknown;
  name?: string | null;
  role?: string | null;
  lead?: boolean | null;
  bio?: string | null;
  linkedin?: string | null;
  site?: string | null;
  hidden?: boolean | null;
  _key?: string;
};

export type TeamAttrs = { members?: TeamMember[] | null; leadLabel?: string | null };

const VERSIONS: Record<string, string> = versions;
const COLORS = ["pale-blue", "yellow", "green", "coral"];

/** A `person` document as a team member (its photo is a Sanity image). */
export function personToMember(p: Pick<PersonDoc, "name" | "role" | "lead" | "bio" | "linkedin" | "site" | "photo"> & { _id?: string }): TeamMember {
  return { _key: p._id, name: p.name, role: p.role, lead: p.lead, bio: p.bio, linkedin: p.linkedin, site: p.site, image: p.photo };
}

/** esc_url: only web, mail and phone links survive (so no `javascript:`). */
function safeUrl(url: string | null | undefined): string {
  let u = (url ?? "").trim();
  // A bare "www.linkedin.com/in/x" (typed without the scheme) is a web address; esc_url adds http://, we use https://.
  if (u && !u.startsWith("/") && !/^[a-z][a-z0-9+.-]*:/i.test(u)) u = `https://${u}`;
  try {
    return ["http:", "https:", "mailto:", "tel:"].includes(new URL(u).protocol) ? u : "";
  } catch {
    return "";
  }
}

/**
 * The headshot's URL. A bundled one carries `?v=` (a hash of the file, photo-versions.json), so a
 * replaced photo shows right away; none that doesn't exist. A Sanity image's URL is named by its asset
 * id, which is the SHA-1 of the file, so a replaced photo is a new URL without anything added.
 */
function photoSrc(m: TeamMember): string {
  if (m.image) return imageUrl(m.image, 640) ?? "";
  const file = (m.photo ?? "").trim();
  const v = Object.hasOwn(VERSIONS, file) ? VERSIONS[file] : "";
  return v ? `/assets/team/${file}.webp?v=${v}` : "";
}

const arrow = (
  <svg className="cle-team-modal__arrow" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
// The LinkedIn "in" mark, drawn inline so it takes the clay button's colour.
const inLogo = (
  <svg className="cle-in" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A1.97 1.97 0 1 0 5.25 6.94 1.97 1.97 0 0 0 5.25 3ZM20.44 13.4c0-3.1-1.66-4.54-3.87-4.54a3.34 3.34 0 0 0-3.03 1.67V8.5h-3.24c.04.95 0 11.5 0 11.5h3.24v-6.42c0-.34.03-.69.13-.93.27-.69.9-1.4 1.95-1.4 1.38 0 1.93 1.05 1.93 2.6V20h3.38l-.49-6.6Z"
    />
  </svg>
);

/**
 * cle/team: one card per person. Someone with a bio, LinkedIn or website gets a button over their photo
 * and name that opens a modal card about them (a <dialog> per person, opened by TeamList); people
 * without any of those just wobble on hover. Without JavaScript the card's contents sit under the photo.
 */
export function TeamView(props: BlockSupports & TeamAttrs) {
  const uid = `cle-team-${useId()}`;
  const [supports, a] = splitSupports(props);
  const leadLabel = a.leadLabel ?? "Leadership";
  const people = (a.members ?? []).filter((m) => (m.name ?? "").trim() !== "" && !m.hidden);
  if (!people.length) return null;
  const has = (p: TeamMember) => (p.bio ?? "").trim() !== "" || safeUrl(p.linkedin) !== "" || safeUrl(p.site) !== "";
  const first = (p: TeamMember) => (p.name ?? "").trim().split(" ")[0];
  const open = people.flatMap((p, i) => (has(p) ? [i] : [])); // People with a card, in order, for "Meet ...".

  return (
    <TeamList {...wrapperProps("team", "cle-team-cards", supports)}>
      {people.map((p, i) => {
        const src = photoSrc(p);
        const card = has(p);
        const id = `${uid}-${i}`;
        const name = (p.name ?? "").trim();
        const initials = name
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => Array.from(w)[0])
          .join("")
          .toUpperCase();
        // No headshot yet: their initials on a clay shape, so the row still lines up.
        const img = src ? (
          // eslint-disable-next-line @next/next/no-img-element -- bundled or Sanity-served webp, already sized
          <img className="cle-team-card__photo" src={src} alt="" width={640} height={700} loading="lazy" decoding="async" />
        ) : (
          <span
            className="cle-team-card__photo cle-team-card__initials"
            aria-hidden="true"
            style={{ "--c": `var(--wp--preset--color--${COLORS[i % 4]})` } as CSSProperties}
          >
            <span>{initials}</span>
          </span>
        );
        const nameEl = <span className="cle-team-card__name">{p.name}</span>;
        const li = safeUrl(p.linkedin);
        const site = safeUrl(p.site);
        const bio = (p.bio ?? "").trim();
        const pos = open.indexOf(i);
        const next = open.length > 1 ? open[(pos + 1) % open.length] : null;
        return (
          <li key={p._key ?? i} className={`cle-team-card${card ? " has-card" : ""}`}>
            {card ? (
              <button type="button" className="cle-team-card__open" aria-haspopup="dialog" aria-controls={id}>
                {img}
                {nameEl}
                <span className="screen-reader-text">, more about {first(p)}</span>
              </button>
            ) : (
              <>
                {img}
                {nameEl}
              </>
            )}
            <p className="cle-team-card__role">{p.role ?? ""}</p>
            {li ? (
              <a className="cle-team-card__in" href={li} rel="noopener" target="_blank">
                {inLogo}
                <span className="screen-reader-text">{p.name} on LinkedIn (opens in a new tab)</span>
              </a>
            ) : null}
            {p.lead ? <p className="cle-team-card__lead">{leadLabel}</p> : null}
            {card ? (
              <dialog className="cle-team-modal" id={id} aria-labelledby={`${id}-name`}>
                <div className="cle-team-modal__card">
                  <button type="button" className="cle-team-modal__close" data-close="">
                    <span aria-hidden="true">×</span>
                    <span className="screen-reader-text">Close</span>
                  </button>
                  <div className="cle-team-modal__photo">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element -- as above
                      <img src={src} alt="" width={640} height={700} loading="lazy" decoding="async" />
                    ) : (
                      img
                    )}
                  </div>
                  <div className="cle-team-modal__body">
                    {p.lead ? <p className="cle-team-modal__lead">{leadLabel}</p> : null}
                    <h3 className="cle-team-modal__name" id={`${id}-name`} tabIndex={-1} autoFocus>
                      {p.name}
                    </h3>
                    {p.role ? <p className="cle-team-modal__role">{p.role}</p> : null}
                    {bio ? <p className="cle-team-modal__bio">{bio}</p> : null}
                    {li || site ? (
                      <p className="cle-team-modal__links">
                        {li ? (
                          <a className="cle-team-modal__link is-linkedin" href={li} rel="noopener" target="_blank">
                            {inLogo}LinkedIn{arrow}
                          </a>
                        ) : null}
                        {site ? (
                          <a className="cle-team-modal__link" href={site} rel="noopener" target="_blank">
                            Website{arrow}
                          </a>
                        ) : null}
                      </p>
                    ) : null}
                    {next !== null ? (
                      <button type="button" className="cle-team-modal__next" data-next={`${uid}-${next}`}>
                        Meet {first(people[next])} <span aria-hidden="true">→</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </dialog>
            ) : null}
          </li>
        );
      })}
    </TeamList>
  );
}

/** The cle/team block: its own `members`, or the team from the `person` documents when it has none. */
export async function TeamBlock(props: BlockSupports & TeamAttrs) {
  const own = props.members ?? [];
  const members = own.length ? own : (await getPeople()).map(personToMember);
  return <TeamView {...props} members={members} />;
}
