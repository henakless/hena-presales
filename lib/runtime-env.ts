type ServerRuntimeEnv = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

const RUNTIME_ENV = Symbol.for("hena.server-runtime-env");

type RuntimeGlobal = typeof globalThis & {
  [RUNTIME_ENV]?: Readonly<ServerRuntimeEnv>;
  process?: { env?: Record<string, string | undefined> };
};

/**
 * Makes Cloudflare's server-only bindings available to bundled route handlers.
 *
 * Vite intentionally does not embed secrets during the build. The custom Worker
 * receives them at request time, so keep them in server memory and never in a
 * request header, response, client bundle, or build artifact.
 */
export function setServerRuntimeEnv(env: ServerRuntimeEnv) {
  const runtimeGlobal = globalThis as RuntimeGlobal;
  runtimeGlobal[RUNTIME_ENV] = Object.freeze({
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_MODEL: env.OPENAI_MODEL,
  });
}

export function getServerRuntimeEnv(name: keyof ServerRuntimeEnv) {
  const runtimeGlobal = globalThis as RuntimeGlobal;
  return runtimeGlobal[RUNTIME_ENV]?.[name] ?? runtimeGlobal.process?.env?.[name];
}
