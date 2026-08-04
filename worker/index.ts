/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { setServerRuntimeEnv } from "../lib/runtime-env";
import { SITE_BASE_PATH } from "../lib/site";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  BRIEFING_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
  EVALUATION_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const SEARCH_EXCLUSION_DIRECTIVES =
  "noindex, nofollow, noarchive, nosnippet, noimageindex";
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "media-src 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "upgrade-insecure-requests",
].join("; ");

function secureResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", SEARCH_EXCLUSION_DIRECTIVES);
  headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function enforceBriefingRateLimit(request: Request, env: Env) {
  if (!env.BRIEFING_RATE_LIMITER) return null;

  const client = request.headers.get("cf-connecting-ip") ?? "unknown";

  try {
    const { success } = await env.BRIEFING_RATE_LIMITER.limit({
      key: `briefing:${client}`,
    });
    if (success) return null;

    return secureResponse(
      Response.json(
        { error: "You’ve generated several briefings already. Please try again shortly." },
        {
          status: 429,
          headers: { "Cache-Control": "no-store", "Retry-After": "60" },
        },
      ),
    );
  } catch (error) {
    console.error("Briefing rate limiter failed", error);
    return secureResponse(
      Response.json(
        { error: "The briefing service is temporarily unavailable. Please try again." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      ),
    );
  }
}

async function enforceSpanishBuddyRateLimit(request: Request, env: Env) {
  if (!env.BRIEFING_RATE_LIMITER) return null;

  const client = request.headers.get("cf-connecting-ip") ?? "unknown";

  try {
    const { success } = await env.BRIEFING_RATE_LIMITER.limit({
      key: `spanishbuddy:${client}`,
    });
    if (success) return null;

    return secureResponse(
      Response.json(
        { error: "Du hast bereits mehrere Lektionen analysiert. Versuche es gleich noch einmal." },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
      ),
    );
  } catch (error) {
    console.error("Spanish Buddy rate limiter failed", error);
    return secureResponse(
      Response.json(
        { error: "Die Lektionsanalyse ist vorübergehend nicht verfügbar. Versuche es erneut." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      ),
    );
  }
}

async function enforceEvaluationRateLimit(request: Request, env: Env) {
  if (!env.EVALUATION_RATE_LIMITER) return null;

  const client = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const { success } = await env.EVALUATION_RATE_LIMITER.limit({ key: `spanishbuddy-evaluate:${client}` });
    if (success) return null;
    return secureResponse(
      Response.json(
        { error: "Du hast bereits mehrere alternative Formulierungen geprüft. Versuche es gleich noch einmal." },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
      ),
    );
  } catch (error) {
    console.error("Spanish Buddy evaluation rate limiter failed", error);
    return secureResponse(
      Response.json(
        { error: "Die Antwortprüfung ist vorübergehend nicht verfügbar." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      ),
    );
  }
}

async function enforceSyncRateLimit(request: Request, env: Env) {
  if (!env.EVALUATION_RATE_LIMITER) return null;

  const client = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const { success } = await env.EVALUATION_RATE_LIMITER.limit({ key: `spanishbuddy-sync:${client}` });
    if (success) return null;
    return secureResponse(
      Response.json(
        { error: "Demasiados intentos de sincronización. Inténtalo de nuevo en un minuto." },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
      ),
    );
  } catch (error) {
    console.error("Spanish Buddy sync rate limiter failed", error);
    return secureResponse(
      Response.json(
        { error: "La sincronización no está disponible temporalmente." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      ),
    );
  }
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    setServerRuntimeEnv(env);
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === `${SITE_BASE_PATH}/api/briefing`) {
      const rateLimitResponse = await enforceBriefingRateLimit(request, env);
      if (rateLimitResponse) return rateLimitResponse;
    }

    if (
      request.method === "POST" &&
      (url.pathname === "/spanishbuddy/api/extract" ||
        url.pathname === `${SITE_BASE_PATH}/spanishbuddy/api/extract`)
    ) {
      const rateLimitResponse = await enforceSpanishBuddyRateLimit(request, env);
      if (rateLimitResponse) return rateLimitResponse;
    }

    if (
      request.method === "POST" &&
      (url.pathname === "/spanishbuddy/api/evaluate" ||
        url.pathname === `${SITE_BASE_PATH}/spanishbuddy/api/evaluate`)
    ) {
      const rateLimitResponse = await enforceEvaluationRateLimit(request, env);
      if (rateLimitResponse) return rateLimitResponse;
    }

    if (
      request.method === "POST" &&
      (url.pathname === "/spanishbuddy/api/sync" ||
        url.pathname === `${SITE_BASE_PATH}/spanishbuddy/api/sync`)
    ) {
      const rateLimitResponse = await enforceSyncRateLimit(request, env);
      if (rateLimitResponse) return rateLimitResponse;
    }

    if (url.pathname === "/robots.txt") {
      return secureResponse(
        new Response("User-agent: *\nAllow: /\n", {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
      );
    }

    if (url.pathname === "/") {
      url.pathname = SITE_BASE_PATH;
      return secureResponse(Response.redirect(url.toString(), 308));
    }

    if (url.pathname === "/spanishbuddy" || url.pathname.startsWith("/spanishbuddy/")) {
      url.pathname = `${SITE_BASE_PATH}${url.pathname}`;
      request = new Request(url.toString(), request);
    }

    if (url.pathname === `${SITE_BASE_PATH}/Hena_Kless_CV_2026.pdf`) {
      url.pathname = `${SITE_BASE_PATH}/Hena_Kless_CV.pdf`;
      return secureResponse(Response.redirect(url.toString(), 308));
    }

    if (url.pathname.startsWith(`${SITE_BASE_PATH}/assets/`)) {
      url.pathname = url.pathname.slice(SITE_BASE_PATH.length);
      return secureResponse(
        await env.ASSETS.fetch(new Request(url.toString(), request)),
      );
    }

    if (url.pathname === `${SITE_BASE_PATH}/_vinext/image`) {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return secureResponse(await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths));
    }

    return secureResponse(await handler.fetch(request, env, ctx));
  },
};

export default worker;
