import { readFileSync } from "node:fs";

/**
 * The clock the e2e build, the e2e server and the component tests share (R7): FIXTURES_NOW in
 * package.json's `build:e2e`, 6 pm on Oct 26 2026, the evening of the fixtures' "Tonight: lightning talks".
 */
export const E2E_NOW = /FIXTURES_NOW=(\S+)/.exec(JSON.parse(readFileSync("package.json", "utf8")).scripts["build:e2e"])![1];
