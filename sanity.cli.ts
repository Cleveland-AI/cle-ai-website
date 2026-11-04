import { defineCliConfig } from "sanity/cli";
import { dataset, projectId } from "./src/sanity/env";

export default defineCliConfig({
  api: { projectId, dataset },
  // The Studio is served by Next.js at /studio; `sanity typegen` reads the extracted schema.
  typegen: {
    path: "./src/**/*.{ts,tsx}",
    schema: "./schema.json",
    generates: "./src/lib/content/types.ts",
    overloadClientMethods: false,
  },
});
