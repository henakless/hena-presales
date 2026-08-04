import { chmod, readFile, writeFile } from "node:fs/promises";

const generatedSecrets = new URL("../dist/server/.dev.vars", import.meta.url);
const generatedWorkerConfig = new URL("../dist/server/wrangler.json", import.meta.url);

// Local builds need the compatibility shim until the bundled Cloudflare plugin
// recognizes the new runtime default. Sites rejects the now-redundant flag.
const workerConfig = JSON.parse(await readFile(generatedWorkerConfig, "utf8"));
workerConfig.compatibility_flags = (workerConfig.compatibility_flags ?? []).filter(
  (flag) => !flag.startsWith("nodejs_compat"),
);
await writeFile(generatedWorkerConfig, `${JSON.stringify(workerConfig)}\n`);

try {
  await chmod(generatedSecrets, 0o600);
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}
