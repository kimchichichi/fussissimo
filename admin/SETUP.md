# Decap CMS on GitHub Pages — setup

GitHub Pages has no server, so Decap needs a tiny **OAuth proxy** (Cloudflare Worker, free) for “Login with GitHub”.

## 0. Repo + Pages

1. Push this site to GitHub (`main` branch).
2. **Settings → Pages →** Deploy from branch `main` / root (`/`).
3. Note your site URL, e.g. `https://USERNAME.github.io/fussissimo/`.

## 1. GitHub OAuth App

1. Open [GitHub → Developer settings → OAuth Apps → New](https://github.com/settings/applications/new).
2. **Application name:** `FUSSISSIMO CMS` (any name).
3. **Homepage URL:** your Worker URL (step 2), e.g. `https://fussissimo-decap-oauth.YOUR_SUBDOMAIN.workers.dev`
4. **Authorization callback URL:** same + `/callback`  
   e.g. `https://fussissimo-decap-oauth.YOUR_SUBDOMAIN.workers.dev/callback`
5. Create → copy **Client ID** → generate **Client Secret**.

> Collaborators who should edit content need **write** access to the repo (or be the owner).

## 2. Deploy the OAuth Worker

```bash
cd cms-oauth
npx --yes wrangler login
npx --yes wrangler deploy
npx --yes wrangler secret put GITHUB_CLIENT_ID      # paste Client ID
npx --yes wrangler secret put GITHUB_CLIENT_SECRET  # paste Client Secret
```

Copy the Worker URL from the deploy output.

If the OAuth App was created before you knew the Worker URL, edit the OAuth App and set Homepage + Callback to match.

## 3. Point Decap at your repo + Worker

Edit `admin/config.yml`:

```yaml
backend:
  name: github
  repo: USERNAME/fussissimo   # your owner/repo
  branch: main
  base_url: https://fussissimo-decap-oauth.YOUR_SUBDOMAIN.workers.dev
  auth_endpoint: auth
```

Commit and push. After Pages rebuilds, open:

`https://USERNAME.github.io/fussissimo/admin/`

→ **Login with GitHub** → edit **Konzerte** → **Publish**.

Publish commits `data/concerts.json` on `main`. GitHub Pages redeploys; the live tour page updates.

## Local test (no GitHub login)

```bash
# terminal 1 — CMS local API
npx --yes decap-server

# terminal 2 — static site (must be port 8081 for local_backend)
npx --yes serve -l 8081 .
```

Open `http://localhost:8081/admin/`.

## Who logs in?

Anyone with a GitHub account that can push to the repo. For a non-technical client: add them as a **collaborator** (Write) and bookmark `/admin/`.

## Optional next collections

Bio, Kontakt, Galerie can get their own entries in `admin/config.yml` the same way (JSON/YAML files + a bit of page JS).
