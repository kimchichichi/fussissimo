/**
 * Minimal GitHub OAuth proxy for Decap CMS (Cloudflare Worker).
 *
 * Deploy once (free Cloudflare account). GitHub Pages cannot store
 * the OAuth client secret, so this tiny worker does the token exchange.
 *
 * Setup: see ../admin/SETUP.md
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = url.origin;

    if (url.pathname === "/auth") {
      return handleAuth(url, env, origin);
    }
    if (url.pathname === "/callback") {
      return handleCallback(url, env, origin);
    }
    return new Response("Decap CMS OAuth proxy OK", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};

function handleAuth(url, env, origin) {
  const provider = url.searchParams.get("provider");
  if (provider !== "github") {
    return new Response("Invalid provider", { status: 400 });
  }
  if (!env.GITHUB_CLIENT_ID) {
    return new Response("Missing GITHUB_CLIENT_ID", { status: 500 });
  }

  // Public repos: public_repo. Private: set GITHUB_REPO_PRIVATE=1
  const privateRepo = env.GITHUB_REPO_PRIVATE === "1";
  const scope = privateRepo ? "repo user" : "public_repo user";
  const state = crypto.randomUUID();

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${origin}/callback?provider=github`);
  authorize.searchParams.set("scope", scope);
  authorize.searchParams.set("state", state);

  return Response.redirect(authorize.toString(), 302);
}

async function handleCallback(url, env, origin) {
  const provider = url.searchParams.get("provider");
  if (provider !== "github") {
    return new Response("Invalid provider", { status: 400 });
  }
  const code = url.searchParams.get("code");
  if (!code) {
    return new Response("Missing code", { status: 400 });
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("Missing OAuth secrets", { status: 500 });
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${origin}/callback?provider=github`,
    }),
  });

  const data = await tokenRes.json();
  if (!data.access_token) {
    const msg = data.error_description || data.error || "token exchange failed";
    return new Response(msg, { status: 400 });
  }

  const token = data.access_token;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Authorizing…</title></head>
<body>
<script>
(function () {
  function receiveMessage(e) {
    window.opener.postMessage(
      "authorization:github:success:" + JSON.stringify({ token: ${JSON.stringify(token)} }),
      e.origin
    );
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
<p>Authorizing Decap CMS…</p>
</body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
