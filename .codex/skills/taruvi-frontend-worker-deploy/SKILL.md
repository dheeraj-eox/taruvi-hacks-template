---
name: taruvi-frontend-worker-deploy
description: Build a frontend app, package its dist output into a zip file, and create or update a Taruvi Frontend Worker deployment. Use when Codex is asked to deploy a Taruvi app, upload a dist build to Taruvi BaaS frontend workers, verify whether a worker already exists before updating it, or read Taruvi deployment settings from a project .env file.
---

# Taruvi Frontend Worker Deploy

Build the project, zip `dist/`, and deploy it to Taruvi Frontend Workers with the bundled script at `scripts/deploy-frontend-worker.mjs`.

Use the script instead of hand-writing `curl` requests when the task is to deploy a JavaScript frontend that already has a working `build` script and a `.env` file with Taruvi credentials.

## Workflow

1. Confirm the project root contains `package.json` and a `build` script that produces `dist/`.
2. Read `references/taruvi-frontend-workers.md` only if you need the exact env-to-API mapping or the fallback naming rules.
3. Run the deploy script:

```bash
node .codex/skills/taruvi-frontend-worker-deploy/scripts/deploy-frontend-worker.mjs \
  --project-root /absolute/path/to/project
```

4. Let the script infer the site from `VITE_TARUVI_BASE_URL` by default. Pass `--site` only when you need to override it.
5. Use `--dry-run` to validate the build and zip flow without uploading anything.
6. If the build fails because local tools are missing, install the project dependencies before retrying the deploy.
7. The bundled script sets `XDG_CONFIG_HOME` inside the project during builds so `refine build` does not fail on machines where home-directory config writes are blocked.
8. After upload, the script attempts to set the newest build active when `TARUVI_FRONTEND_WORKER_BEARER_TOKEN` or `TARUVI_CONSOLE_ACCESS_TOKEN` is available.

## Defaults

- Read auth from the project `.env` or `.env.local`.
- Use `VITE_TARUVI_API_KEY` as an `Authorization: Api-Key ...` credential.
- Use `VITE_TARUVI_APP_SLUG` as the preferred frontend worker name.
- Use `VITE_TARUVI_APP_SLUG` as the frontend worker `app` field too.
- Use `TARUVI_FRONTEND_WORKER_SITE` when present; otherwise infer the site from `VITE_TARUVI_BASE_URL`.
- Use `TARUVI_FRONTEND_WORKER_BEARER_TOKEN` or `TARUVI_CONSOLE_ACCESS_TOKEN` for the `set-active-build` API step.
- For this repo's current `.env`, the inferred site is `hackkj` and the worker name is `test`.
- Create the worker with the app slug first.
- If a worker with that exact name already exists, patch its file upload instead of creating a duplicate.
- If name validation fails for a different reason, create a fallback worker name by appending a timestamp suffix.
- If a newer build uploads successfully and a bearer token is configured, set that build active automatically.

## Safety

- Never print the API key in logs or responses.
- Stop if the build fails or `dist/` is missing.
- Keep the generated zip only when `--keep-zip` is passed.
