#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const args = {
    activateBuild: true,
    apiBase: "https://api.taruvi.cloud",
    dryRun: false,
    internal: true,
    keepZip: false,
    skipBuild: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (arg === "--no-activate-build") {
      args.activateBuild = false;
      continue;
    }
    if (arg === "--keep-zip") {
      args.keepZip = true;
      continue;
    }
    if (arg === "--skip-build") {
      args.skipBuild = true;
      continue;
    }
    if (arg === "--site") {
      args.site = argv[++index];
      continue;
    }
    if (arg === "--project-root") {
      args.projectRoot = argv[++index];
      continue;
    }
    if (arg === "--env-file") {
      args.envFile = argv[++index];
      continue;
    }
    if (arg === "--app-name") {
      args.appName = argv[++index];
      continue;
    }
    if (arg === "--api-base") {
      args.apiBase = argv[++index];
      continue;
    }
    if (arg === "--app-field") {
      args.appField = argv[++index];
      continue;
    }
    if (arg === "--activation-token") {
      args.activationToken = argv[++index];
      continue;
    }
    if (arg === "--zip-path") {
      args.zipPath = argv[++index];
      continue;
    }
    if (arg === "--internal") {
      args.internal = argv[++index] !== "false";
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.projectRoot) {
    throw new Error("Missing required argument: --project-root");
  }

  return args;
}

function loadEnv(envPath) {
  const env = {};
  const content = readFileSync(envPath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function resolveEnvFile(projectRoot, explicitPath) {
  if (explicitPath) {
    const resolved = resolve(explicitPath);
    if (!existsSync(resolved)) {
      throw new Error(`Env file not found: ${resolved}`);
    }
    return resolved;
  }

  const candidates = [".env.local", ".env"].map((name) => join(projectRoot, name));
  const existing = candidates.find((candidate) => existsSync(candidate));
  if (!existing) {
    throw new Error("No .env.local or .env file found in the project root");
  }
  return existing;
}

function requireDirectory(pathValue, label) {
  if (!existsSync(pathValue)) {
    throw new Error(`${label} not found: ${pathValue}`);
  }
  const stats = statSync(pathValue);
  if (!stats.isDirectory()) {
    throw new Error(`${label} is not a directory: ${pathValue}`);
  }
}

function requireFile(pathValue, label) {
  if (!existsSync(pathValue)) {
    throw new Error(`${label} not found: ${pathValue}`);
  }
}

function inferSiteFromBaseUrl(baseUrl) {
  if (!baseUrl) return undefined;
  try {
    const hostname = new URL(baseUrl).hostname;
    return hostname.split(".")[0] || undefined;
  } catch {
    return undefined;
  }
}

function sanitizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function fallbackName(name) {
  return `${sanitizeName(name) || "frontend-worker"}-${Date.now()}`;
}

function detectPackageManager(projectRoot) {
  const lockfiles = [
    { file: "pnpm-lock.yaml", command: "pnpm" },
    { file: "yarn.lock", command: "yarn" },
    { file: "package-lock.json", command: "npm" },
  ];

  const match = lockfiles.find(({ file }) => existsSync(join(projectRoot, file)));
  return match?.command ?? "npm";
}

function runBuild(projectRoot) {
  const packageJsonPath = join(projectRoot, "package.json");
  requireFile(packageJsonPath, "package.json");

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (!packageJson.scripts?.build) {
    throw new Error(`No build script found in ${packageJsonPath}`);
  }

  const packageManager = detectPackageManager(projectRoot);
  console.log(`Building with ${packageManager} run build`);
  const buildEnv = {
    ...process.env,
    UPDATE_NOTIFIER_IS_DISABLED: "true",
    REFINE_NO_TELEMETRY: "true",
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || join(projectRoot, ".codex-tmp"),
  };

  try {
    if (packageManager === "yarn") {
      execFileSync("yarn", ["build"], { cwd: projectRoot, env: buildEnv, stdio: "inherit" });
      return;
    }

    execFileSync(packageManager, ["run", "build"], { cwd: projectRoot, env: buildEnv, stdio: "inherit" });
  } catch {
    throw new Error(
      `Build failed in ${projectRoot}. Install project dependencies first and confirm '${packageManager} run build' works before deploying.`,
    );
  }
}

function zipDist(projectRoot, zipPath) {
  const distPath = join(projectRoot, "dist");
  requireDirectory(distPath, "dist directory");

  if (existsSync(zipPath)) {
    rmSync(zipPath, { force: true });
  }

  execFileSync("zip", ["-rq", zipPath, "dist"], { cwd: projectRoot, stdio: "inherit" });
  requireFile(zipPath, "zip archive");
}

function authHeaders(apiKey) {
  return {
    Accept: "*/*",
    Authorization: `Api-Key ${apiKey}`,
  };
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  return {
    data,
    ok: response.ok,
    status: response.status,
    text,
  };
}

function bearerHeaders(token) {
  return {
    Accept: "*/*",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function workerPayload(payload) {
  if (payload?.data && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return payload;
}

function workerName(worker) {
  return worker?.name ?? worker?.worker_name ?? worker?.slug ?? worker?.id;
}

function workerDetailUrl(worker, collectionUrl, apiBase) {
  if (typeof worker?.url === "string" && worker.url) {
    if (worker.url.startsWith("http://") || worker.url.startsWith("https://")) {
      return worker.url;
    }
    return new URL(worker.url, `${apiBase}/`).toString();
  }

  const identifier = worker?.id ?? worker?.slug ?? worker?.pk ?? worker?.uuid;
  if (!identifier) {
    return null;
  }

  return new URL(`${String(identifier).replace(/^\/+|\/+$/g, "")}/`, collectionUrl).toString();
}

function zipFormData(zipPath, filename, extraFields = {}) {
  const zipBytes = readFileSync(zipPath);
  const zipBlob = new Blob([zipBytes], { type: "application/zip" });
  const formData = new FormData();

  for (const [key, value] of Object.entries(extraFields)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }

  formData.append("file", zipBlob, filename);
  return formData;
}

function errorMentionsNameConflict(payload, text) {
  const haystack = `${JSON.stringify(payload ?? {})} ${text ?? ""}`.toLowerCase();
  return haystack.includes("already exists") || haystack.includes("unique") || haystack.includes("duplicate");
}

function errorMentionsNameValidation(payload, text) {
  const haystack = `${JSON.stringify(payload ?? {})} ${text ?? ""}`.toLowerCase();
  return haystack.includes("name");
}

async function listWorkers(collectionUrl, apiKey) {
  const result = await requestJson(collectionUrl, {
    headers: authHeaders(apiKey),
    method: "GET",
  });

  if (!result.ok) {
    throw new Error(`Failed to list frontend workers (${result.status}): ${result.text}`);
  }

  return toArray(result.data);
}

async function patchWorker(detailUrl, apiKey, zipPath, filename) {
  const response = await requestJson(detailUrl, {
    body: zipFormData(zipPath, filename),
    headers: authHeaders(apiKey),
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to update frontend worker (${response.status}): ${response.text}`);
  }

  return response.data ?? response.text;
}

async function createWorker(collectionUrl, apiKey, zipPath, filename, name, internal, appField) {
  return requestJson(collectionUrl, {
    body: zipFormData(zipPath, filename, {
      app: appField,
      is_internal: internal,
      name,
    }),
    headers: authHeaders(apiKey),
    method: "POST",
  });
}

async function setActiveBuild(detailUrl, activationToken, buildUuid) {
  const response = await requestJson(new URL("set-active-build/", detailUrl).toString(), {
    body: JSON.stringify({ build_uuid: buildUuid }),
    headers: bearerHeaders(activationToken),
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to set active build (${response.status}): ${response.text}`);
  }

  return response.data ?? response.text;
}

async function maybeActivateBuild(worker, detailUrl, activationToken, activateBuild) {
  const payload = workerPayload(worker);
  const latestBuildUuid = payload?.latest_build?.uuid;
  const activeBuildUuid = payload?.active_build_uuid ?? payload?.active_build_info?.uuid;

  if (!activateBuild) {
    return null;
  }
  if (!latestBuildUuid) {
    console.log("No latest build UUID returned, skipping active build step");
    return null;
  }
  if (activeBuildUuid === latestBuildUuid) {
    console.log("Latest build is already active");
    return null;
  }
  if (!activationToken) {
    console.log("No activation bearer token configured, skipping active build step");
    return null;
  }

  const activationResult = await setActiveBuild(detailUrl, activationToken, latestBuildUuid);
  console.log(`Set build '${latestBuildUuid}' as active`);
  console.log(JSON.stringify(activationResult, null, 2));
  return activationResult;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = resolve(args.projectRoot);
  requireDirectory(projectRoot, "project root");

  const envFile = resolveEnvFile(projectRoot, args.envFile);
  const env = loadEnv(envFile);
  const apiKey = env.VITE_TARUVI_API_KEY;
  const appName = args.appName || env.VITE_TARUVI_APP_SLUG;
  const appField = args.appField || env.TARUVI_FRONTEND_WORKER_APP || env.VITE_TARUVI_APP_SLUG;
  const activationToken =
    args.activationToken || env.TARUVI_FRONTEND_WORKER_BEARER_TOKEN || env.TARUVI_CONSOLE_ACCESS_TOKEN;
  const site = args.site || env.TARUVI_FRONTEND_WORKER_SITE || inferSiteFromBaseUrl(env.VITE_TARUVI_BASE_URL);

  if (!apiKey) {
    throw new Error(`VITE_TARUVI_API_KEY not found in ${envFile}`);
  }
  if (!appName) {
    throw new Error("App name not provided and VITE_TARUVI_APP_SLUG is missing");
  }
  if (!appField) {
    throw new Error("App field not provided and VITE_TARUVI_APP_SLUG is missing");
  }
  if (!site) {
    throw new Error("Site not provided and could not be inferred from .env");
  }

  const zipPath = resolve(args.zipPath || join(projectRoot, `${sanitizeName(appName) || "dist"}.zip`));
  const filename = basename(zipPath);
  const collectionUrl = `${args.apiBase.replace(/\/+$/, "")}/sites/${site}/api/cloud/frontend_workers/`;

  console.log(`Project root: ${projectRoot}`);
  console.log(`Env file: ${envFile}`);
  console.log(`Site: ${site}`);
  console.log(`Worker name: ${appName}`);
  console.log(`App field: ${appField}`);
  console.log(`Collection URL: ${collectionUrl}`);

  if (!args.skipBuild) {
    runBuild(projectRoot);
  } else {
    console.log("Skipping build");
  }

  zipDist(projectRoot, zipPath);
  console.log(`Created zip: ${zipPath}`);

  if (args.dryRun) {
    console.log("Dry run complete. Skipped API upload.");
    if (!args.keepZip) {
      rmSync(zipPath, { force: true });
      console.log("Removed zip after dry run");
    }
    return;
  }

  try {
    const workers = await listWorkers(collectionUrl, apiKey);
    const existing = workers.find((worker) => workerName(worker) === appName);

    if (existing) {
      const detailUrl = workerDetailUrl(existing, collectionUrl, args.apiBase);
      if (!detailUrl) {
        throw new Error(`Found worker '${appName}' but could not resolve its detail URL`);
      }
      const updateResult = await patchWorker(detailUrl, apiKey, zipPath, filename);
      console.log(`Updated existing frontend worker '${appName}'`);
      console.log(JSON.stringify(updateResult, null, 2));
      await maybeActivateBuild(updateResult, detailUrl, activationToken, args.activateBuild);
      return;
    }

    let createResult = await createWorker(
      collectionUrl,
      apiKey,
      zipPath,
      filename,
      appName,
      args.internal,
      appField,
    );

    if (createResult.ok) {
      console.log(`Created new frontend worker '${appName}'`);
      console.log(JSON.stringify(createResult.data, null, 2));
      const detailUrl = workerDetailUrl(createResult.data, collectionUrl, args.apiBase);
      if (detailUrl) {
        await maybeActivateBuild(createResult.data, detailUrl, activationToken, args.activateBuild);
      }
      return;
    }

    if (errorMentionsNameConflict(createResult.data, createResult.text)) {
      const refreshedWorkers = await listWorkers(collectionUrl, apiKey);
      const conflicted = refreshedWorkers.find((worker) => workerName(worker) === appName);
      const detailUrl = conflicted ? workerDetailUrl(conflicted, collectionUrl, args.apiBase) : null;

      if (!detailUrl) {
        throw new Error(
          `Create reported a name conflict for '${appName}', but no matching worker detail URL was found`,
        );
      }

      const updateResult = await patchWorker(detailUrl, apiKey, zipPath, filename);
      console.log(`Updated existing frontend worker '${appName}' after create conflict`);
      console.log(JSON.stringify(updateResult, null, 2));
      await maybeActivateBuild(updateResult, detailUrl, activationToken, args.activateBuild);
      return;
    }

    if (errorMentionsNameValidation(createResult.data, createResult.text)) {
      const alternateName = fallbackName(appName);
      console.log(`Name validation failed for '${appName}'. Retrying with '${alternateName}'`);

      createResult = await createWorker(
        collectionUrl,
        apiKey,
        zipPath,
        zipPath.endsWith(".zip") ? basename(zipPath) : `${alternateName}.zip`,
        alternateName,
        args.internal,
        appField,
      );

      if (createResult.ok) {
        console.log(`Created new frontend worker '${alternateName}'`);
        console.log(JSON.stringify(createResult.data, null, 2));
        const detailUrl = workerDetailUrl(createResult.data, collectionUrl, args.apiBase);
        if (detailUrl) {
          await maybeActivateBuild(createResult.data, detailUrl, activationToken, args.activateBuild);
        }
        return;
      }
    }

    throw new Error(`Failed to create frontend worker (${createResult.status}): ${createResult.text}`);
  } finally {
    if (!args.keepZip && existsSync(zipPath)) {
      rmSync(zipPath, { force: true });
      console.log("Removed zip");
    }
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
