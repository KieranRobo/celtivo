// Runs extraction on .eml files without the database, printing what each one yields:
//
//   pnpm extract fixtures/emails/*.eml
//
// Calls Claude (ANTHROPIC_API_KEY from .env.local; EXTRACTION_MODEL to compare models) for
// any email without usable schema.org markup. Real emails hold personal data: keep them in
// fixtures/emails/, which is gitignored.

import { readFile } from "node:fs/promises";

import nextEnv from "@next/env";

import { claudeExtractor } from "@/features/extraction/ai";
import { extractBookings } from "@/features/extraction/pipeline";

nextEnv.loadEnvConfig(process.cwd());

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: pnpm extract <file.eml> [more.eml …]");
  process.exit(1);
}

const ai = claudeExtractor();
let failures = 0;
for (const file of files) {
  try {
    const result = await extractBookings(new Uint8Array(await readFile(file)), { ai });
    const usage = result.usage
      ? ` · ${result.usage.model} · ${result.usage.inputTokens} in / ${result.usage.outputTokens} out`
      : "";
    console.log(
      `\n${file}: ${result.bookings.length} booking(s) via ${result.path ?? "pre-filter (skipped)"}${usage}`,
    );
    for (const booking of result.bookings) {
      console.log(JSON.stringify({ kind: booking.kind, ...(booking.booking as object) }, null, 2));
    }
  } catch (error) {
    failures++;
    console.error(`\n${file}: failed`, error);
  }
}
process.exit(failures > 0 ? 1 : 0);
