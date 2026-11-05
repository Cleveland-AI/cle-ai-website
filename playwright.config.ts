import { defineConfig, devices } from "@playwright/test";
import { E2E_NOW } from "./tests/e2eNow";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Tests never call anything live: Poptin's pixel (Task 15) and the jQuery it pulls from cdnjs, the
        // Substack and Givebutter embeds, Turnstile, Meetup links. No host but the test server resolves,
        // so every other load fails fast (ERR_NAME_NOT_RESOLVED); specs stub hosts they need via page.route.
        launchOptions: { args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1"] },
      },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { CONTENT_SOURCE: "fixtures", FIXTURES_NOW: E2E_NOW },
  },
});
