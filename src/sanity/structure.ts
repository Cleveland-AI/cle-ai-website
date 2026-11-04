import type { StructureResolver } from "sanity/structure";

/** One document each, at a fixed id. */
export const SINGLETONS = ["siteSettings", "homepage"] as const;

const isSingleton = (type: string) => (SINGLETONS as readonly string[]).includes(type);

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Homepage")
        .id("homepage")
        .child(S.document().schemaType("homepage").documentId("homepage")),
      S.listItem()
        .title("Site settings")
        .id("siteSettings")
        .child(S.document().schemaType("siteSettings").documentId("siteSettings")),
      S.listItem()
        .title("Form submissions")
        .id("submission")
        .child(
          S.documentTypeList("submission")
            .title("Form submissions")
            .defaultOrdering([{ field: "receivedAt", direction: "desc" }]),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => !isSingleton(item.getId() ?? "") && item.getId() !== "submission"),
    ]);

export { isSingleton };
