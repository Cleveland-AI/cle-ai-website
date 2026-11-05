import type { SanityClient } from "@sanity/client";
import type { TokenStore } from "./client";

/** A dotted _id is private in Sanity: it is never served by the public API or listed in the Studio. */
export const TOKEN_DOC_ID = "secrets.meetupSync";

/** Keeps Meetup's rotating refresh token in one private document, using the server write client. */
export function createSanityTokenStore(client: Pick<SanityClient, "fetch" | "createOrReplace">): TokenStore {
  return {
    async get() {
      const t = await client.fetch<string | null>(`*[_id == "${TOKEN_DOC_ID}"][0].refreshToken`);
      return t || undefined;
    },
    async set(refreshToken) {
      await client.createOrReplace({ _id: TOKEN_DOC_ID, _type: "meetupSyncState", refreshToken });
    },
  };
}
