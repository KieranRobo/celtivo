// Sends an .eml file through the same steps as the Email Worker, against the local app:
//
//   pnpm inbound:send <file.eml> <trip-address> [envelope-from]
//
// The raw message is written to .inbound/ (standing in for R2), then POSTed to
// http://localhost:3000/api/inbound/email with INBOUND_EMAIL_SECRET from .env.local.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import nextEnv from "@next/env";

import { notifyApp, receive, type RawStore } from "../workers/inbound-email/src/inbound.ts";

const [file, to, from = "dev@localhost"] = process.argv.slice(2);
if (!file || !to) {
  console.error("Usage: pnpm inbound:send <file.eml> <trip-address> [envelope-from]");
  process.exit(1);
}

nextEnv.loadEnvConfig(process.cwd());
const secret = process.env.INBOUND_EMAIL_SECRET;
if (!secret) {
  console.error("INBOUND_EMAIL_SECRET is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const root = path.join(process.cwd(), ".inbound");
const fileFor = (key: string) => path.join(root, key);

const folderStore: RawStore = {
  async put(key, raw) {
    await mkdir(path.dirname(fileFor(key)), { recursive: true });
    await writeFile(fileFor(key), raw);
  },
  async delete(key) {
    await rm(fileFor(key), { force: true });
  },
  async markUnacked(key) {
    console.warn(`The app didn't acknowledge it; the raw message stays at ${fileFor(key)}`);
  },
};

const raw = new Uint8Array(await readFile(file));
const outcome = await receive(raw, { to, from }, folderStore, (notice) =>
  notifyApp({ url: process.env.APP_URL ?? "http://localhost:3000", secret }, notice, {
    delays: [],
  }),
);
console.log(outcome);
process.exit(outcome === "failed" ? 1 : 0);
