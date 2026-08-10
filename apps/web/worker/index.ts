interface Environment {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

const SECURITY_HEADERS = {
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "cross-origin-opener-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

export default {
  async fetch(request: Request, environment: Environment): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "learn-anything" }, {
        headers: { "cache-control": "no-store" },
      });
    }
    const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
    const assetRequest = url.pathname === "/" || acceptsHtml
      ? new Request(new URL("/app.html", request.url), request)
      : request;
    const response = await environment.ASSETS.fetch(assetRequest);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
