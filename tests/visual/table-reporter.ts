import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

type Row = { route: string; width: string; percent: number; masked: string; status: string };

/** Prints the route × width × diff % table at the end of `npm run visual` and saves it to out/results.md. */
export default class TableReporter implements Reporter {
  private rows: Row[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    const note = test.annotations.find((a) => a.type === "diff") ?? result.annotations?.find((a) => a.type === "diff");
    const [route, width] = test.title.split(" @ ");
    const d = note?.description ? (JSON.parse(note.description) as { percent: number; maskedWp: number; maskedNext: number }) : null;
    const masked = d ? `${d.maskedWp.toFixed(2)} / ${d.maskedNext.toFixed(2)}` : "n/a";
    this.rows.push({ route, width, percent: d ? d.percent : NaN, masked, status: result.status });
  }

  onEnd() {
    const order = (r: Row) => r.route + (r.width === "1440" ? "0" : "1");
    const rows = this.rows.sort((a, b) => order(a).localeCompare(order(b)));
    const lines = ["| Route | Width | Diff % | Masked % (WP / Next) | Result |", "|---|---|---|---|---|"];
    for (const r of rows)
      lines.push(`| ${r.route} | ${r.width} | ${Number.isNaN(r.percent) ? "n/a" : r.percent.toFixed(2)} | ${r.masked} | ${r.status} |`);
    const table = lines.join("\n");
    const out = path.join(__dirname, "out");
    mkdirSync(out, { recursive: true });
    writeFileSync(path.join(out, "results.md"), table + "\n");
    console.log("\n" + table);
  }
}
