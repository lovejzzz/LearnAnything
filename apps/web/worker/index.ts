interface Environment {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
  async fetch(request: Request, environment: Environment): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "learn-anything" }, {
        headers: { "cache-control": "no-store" },
      });
    }
    return environment.ASSETS.fetch(request);
  },
};
