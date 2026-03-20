# Taruvi Frontend Workers

## Env Mapping

- `VITE_TARUVI_API_KEY`: send as `Authorization: Api-Key <value>`
- `VITE_TARUVI_APP_SLUG`: preferred worker name
- `VITE_TARUVI_APP_SLUG`: default multipart `app` field value
- `VITE_TARUVI_BASE_URL`: infer site from hostname only when an explicit site is not provided
- `TARUVI_FRONTEND_WORKER_SITE`: optional override for the Taruvi site name
- `TARUVI_FRONTEND_WORKER_APP`: optional override for the multipart `app` field; default to `VITE_TARUVI_APP_SLUG`
- `TARUVI_FRONTEND_WORKER_BEARER_TOKEN` or `TARUVI_CONSOLE_ACCESS_TOKEN`: bearer token for `set-active-build`

## API Flow

Collection endpoint:

```text
https://api.taruvi.cloud/sites/<site>/api/cloud/frontend_workers/
```

Detail endpoint:

```text
https://api.taruvi.cloud/sites/<site>/api/cloud/frontend_workers/<worker-id-or-slug>/
```

Create request multipart fields:

- `name`
- `is_internal`
- `app`
- `file`

Patch request multipart fields:

- `file`

Set-active-build endpoint:

```text
https://api.taruvi.cloud/sites/<site>/api/cloud/frontend_workers/<worker-id-or-slug>/set-active-build/
```

Set-active-build request body:

- `build_uuid`

## Selection Rules

1. Use the app slug as the first-choice worker name.
2. Search the collection for an exact name match before creating a new worker.
3. If a matching worker exists, patch it.
4. If create fails because the name already exists, search again and patch the existing worker.
5. If create fails because the name is invalid for another reason, retry with `<app-slug>-<timestamp>`.

## Current Repo Notes

This workspace contains a Vite app at `/Users/kj/Documents/Projects/Taruvi Hackathon India/taruvi-hacks-template`.

Observed `.env` keys in that project:

- `VITE_TARUVI_BASE_URL`
- `VITE_TARUVI_API_KEY`
- `VITE_TARUVI_APP_SLUG`
- `VITE_TARUVI_APP_TITLE`

Current values imply:

- Site: `hackkj` from `VITE_TARUVI_BASE_URL=https://hackkj.taruvi.cloud`
- Worker name: `test` from `VITE_TARUVI_APP_SLUG=test`
- App field: `test` from `VITE_TARUVI_APP_SLUG=test`
