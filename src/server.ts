import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

const LLM_BACKEND_API_KEY =
  process.env.LLM_API_KEY || process.env.FAST_API_KEY || process.env.VITE_LLM_API_KEY || "";

function getBackendBaseUrl() {
  const raw = process.env.LLM_API_BASE_URL || process.env.LLM_BACKEND_BASE_URL || process.env.VITE_LLM_API_PROXY_TARGET || process.env.VITE_LLM_API_BASE_URL || "http://127.0.0.1:2828";

  if (typeof raw !== "string") {
    return "http://127.0.0.1:2828";
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "");
  }

  if (raw.startsWith("/")) {
    return "http://127.0.0.1:2828";
  }

  return raw.replace(/\/$/, "");
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/v1/chat/completions") {
        const backendBaseUrl = getBackendBaseUrl();
        const upstreamUrl = new URL(`${backendBaseUrl}/v1/chat/completions${url.search}`);

        const headers = new Headers(request.headers);
        headers.set("host", upstreamUrl.host);
        if (LLM_BACKEND_API_KEY) {
          headers.set("Authorization", `Bearer ${LLM_BACKEND_API_KEY}`);
        }

        const upstreamResponse = await fetch(upstreamUrl, {
          method: request.method,
          headers,
          body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
        });

        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          headers: upstreamResponse.headers,
        });
      }

      if (url.pathname.startsWith("/api/")) {
        return new Response(JSON.stringify({ error: "API route not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
