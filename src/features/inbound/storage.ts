import { readFile } from "node:fs/promises";
import path from "node:path";

import { AwsClient } from "aws4fetch";

/** The stored raw message is gone: expired by the bucket's 30-day lifecycle, or deleted. */
export class RawEmailMissing extends Error {}

export type RawEmailStore = { read(key: string): Promise<Uint8Array> };

/**
 * Where the Email Worker put raw messages. With the R2_* variables set, that's the R2
 * bucket, read over its S3-compatible API; otherwise the .inbound/ folder that
 * `pnpm inbound:send` writes to.
 */
export function rawEmailStore(env = process.env): RawEmailStore {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env;
  if (R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
    return r2Store(R2_ENDPOINT, env.R2_BUCKET || "celtivo-inbound", {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    });
  }
  return folderStore(path.join(process.cwd(), ".inbound"));
}

export function isR2Configured(env = process.env): boolean {
  return Boolean(env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
}

function r2Store(
  endpoint: string,
  bucket: string,
  credentials: { accessKeyId: string; secretAccessKey: string },
): RawEmailStore {
  const client = new AwsClient({ ...credentials, service: "s3", region: "auto" });
  return {
    async read(key) {
      const url = `${endpoint.replace(/\/$/, "")}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
      const response = await client.fetch(url);
      if (response.status === 404) throw new RawEmailMissing(`No object at ${key}`);
      if (!response.ok) {
        // R2's XML error names the cause: SignatureDoesNotMatch, InvalidAccessKeyId, AccessDenied…
        const code = /<Code>([^<]+)<\/Code>/.exec(await response.text())?.[1];
        throw new Error(`R2 answered ${response.status}${code ? ` (${code})` : ""} for ${key}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
  };
}

function folderStore(root: string): RawEmailStore {
  return {
    async read(key) {
      try {
        return new Uint8Array(await readFile(path.join(root, key)));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          throw new RawEmailMissing(`No file at ${path.join(root, key)}`);
        }
        throw error;
      }
    },
  };
}
