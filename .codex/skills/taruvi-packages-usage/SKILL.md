---
name: taruvi-packages-usage
description: How to use Taruvi npm packages (@taruvi/sdk, @taruvi/refine-providers, Refine v5) on the frontend, and the Taruvi Python SDK in Python runtimes (including Taruvi serverless functions). Use when the user asks about Taruvi, Refine data providers, TypeScript/JavaScript client, edge functions, Python SDK, backend scripts, storage, auth, access control, or Cerbos.
---

# Taruvi packages usage (self-contained)

## Mandatory rules

- **Primary source of truth:** Everything the model needs is in **this skill directory only**—especially `REFERENCE.md` next to this file. Assume the **project has no separate `docs/` tree** for Taruvi.
- **Never** answer Taruvi-related questions from memory. **Open and read `REFERENCE.md`** (search by heading or keyword) before answering any Taruvi usage question.
- **Always use this document when:** the user mentions Taruvi, the user is building with Refine + Taruvi, or the question involves `@taruvi/sdk` or Taruvi providers.
- **If unsure:** default to `REFERENCE.md`.
- **Do not** suggest generic REST APIs for Taruvi.
- **Do not** invent endpoints.
- **Do not** answer Taruvi questions without using this spec.
- Use training data only for generic concepts (for example what Refine is), not for Taruvi-specific APIs or behavior.

## Frontend vs Python (do not mix them)

| Context | Packages | Notes |
|---------|-----------|--------|
| **Browser / React / Refine** | `@refinedev/core`, **`@taruvi/sdk`** (JS/TS), **`@taruvi/refine-providers`** | Always use these for frontend Taruvi work. **Do not use the Python SDK here**—it does not run in the frontend. |
| **Python** (functions, scripts, services) | **Taruvi Python SDK** | Always use the Taruvi Python SDK for backend/Python work. **Taruvi functions** inject a ready-to-use `sdk_client`. Patterns in `REFERENCE.md` are written around that injected client, but the same API shapes apply when you construct a client yourself in other Python environments unless the doc says otherwise. |

## Workflow requirements

- For frontend (`React + Refine`): always use `@taruvi/sdk` and `@taruvi/refine-providers`.
- For backend / Python: always use the Taruvi Python SDK.
- Never mix frontend and Python SDK usage.
- Before Taruvi edits, read `SKILL.md` and `REFERENCE.md`.
- Before making edits, state in commentary that you read them.
- In the final response, cite the specific Taruvi reference section used.
- If either file is unavailable, stop and say so.

## Taruvi Query Strategy

When building Taruvi dashboards, analytics views, KPI cards, summary panels, or charts with Refine, choose the query shape based on the data need, not just what is easiest to code.

### Default rule

Prefer a single server-side aggregated query over multiple filtered queries whenever the UI needs summary metrics rather than separate row sets.

Use:

- `meta.aggregate` for counts, sums, averages, mins, maxes, and similar metrics
- `meta.groupBy` when the UI needs metrics split by status, category, department, owner, date bucket, or similar grouping dimensions
- `meta.having` when the UI needs to filter grouped results after aggregation

### Required preference order

1. If the UI needs grouped counts or summary metrics, use one aggregated query with `aggregate` and `groupBy`.
2. If the UI needs post-aggregation filtering, add `having`.
3. Only use multiple filtered `useList` queries when the UI truly needs multiple separate row lists or when grouped aggregation cannot express the requirement cleanly.
4. Do not issue one query per status/value/category if one grouped query can produce the same result.
5. Assume tables may grow to 10k+ rows. Prefer constant query count and server-side aggregation over simpler but redundant client-side orchestration.

### Examples

Use grouped aggregation:

- status dashboard cards: count users by `status`
- department summary: count employees by `department`
- revenue chart: `sum(total)` grouped by month
- quality dashboard: `avg(score)` grouped by team
- leaderboard: `count(*)` grouped by owner, optionally filtered with `having`

Avoid this pattern unless row sets are actually needed:

- one `useList` for `status = active`
- one `useList` for `status = inactive`
- one `useList` for `status = terminated`

If the page only needs counts for those statuses, this must be implemented as one grouped query instead.

### Refine/Taruvi examples

Grouped count by status:

```ts
const { result, query } = useList({
  resource: "dummy_users",
  pagination: { mode: "off" },
  meta: {
    aggregate: ["count(*) as status_count"],
    groupBy: ["status"],
  },
});
```

Grouped count with post-aggregation filter:

```ts
const { result, query } = useList({
  resource: "orders",
  pagination: { mode: "off" },
  meta: {
    aggregate: ["count(*) as order_count", "sum(total) as revenue"],
    groupBy: ["region"],
    having: [{ field: "sum(total)", operator: "gte", value: 1000 }],
  },
});
```

Use plain filtered queries only for real row retrieval:

```ts
const { result, query } = useList({
  resource: "dummy_users",
  filters: [{ field: "status", operator: "eq", value: "inactive" }],
  pagination: { currentPage: 1, pageSize: 25 },
});
```

That filtered query is appropriate for an inactive-users table, but not for dashboard summary cards if grouped aggregation can answer the same question.

### Instruction to the agent

When both approaches are valid, do not choose the simpler multi-query implementation by default. Choose the aggregated server-side query shape for dashboards and summaries.

## How to use this skill

1. Skill root: `.codex/skills/taruvi-packages-usage/` (after you rename/copy the folder).
2. Read **`REFERENCE.md`**. Sections include **Refine** provider guides and **Python SDK** (full detail).
3. Answer from what you read; quote or paraphrase accurately.

## Copying to another project

Copy the **whole** folder `.codex/skills/taruvi-packages-usage/` including **`REFERENCE.md`**. One file without `REFERENCE.md` is incomplete.
