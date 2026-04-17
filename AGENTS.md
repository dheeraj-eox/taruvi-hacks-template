# AGENTS.md - AI Assistant Guide for Taruvi Refine Template

## Functional App Default

If the user asks to create or build an app, default to a functional, production-ready app — not a mockup, not a demo, not an MVP.

A functional app in this repo means:
- create Taruvi schema with MCP tools
- seed enough real data to use the app
- register Refine resources in `src/App.tsx`
- build real list/create/edit/show flows for core resources
- wire dashboards/pages to live data, automatically calculated from the system's data and kept up to date — never hardcoded or demo values

If the user wants a UI-only prototype, they must explicitly say so.

## Project Overview

This is a **Refine.dev v5** project - a React-based framework for building admin panels, dashboards, and internal tools.

**CRITICAL:** This project uses **Refine v5** which has significantly different hook syntax from v4. Always use the v5 patterns documented in the "[IMPORTANT: Refine v5 Syntax Changes](#important-refine-v5-syntax-changes)" section below.

IMPORTANT: Always use Context7 MCP Skill when I need library/API, Refine v5, MUI documentation without me having to explicitly ask.

**When confused or need clarification:** Use the Task tool with `subagent_type='Explore'` and set thoroughness to "medium" or "very thorough" to understand the codebase patterns before making changes.

**Documentation:** [Refine](https://refine.dev/docs) | [MUI DataGrid](https://mui.com/x/react-data-grid/) | [React Hook Form](https://react-hook-form.com/)

## Remember

1. **Always use Refine v5 syntax** - Check the v5 syntax section
2. **Always read files before editing** - Use Read tool
3. **Follow existing patterns** - Check similar components
4. **Use TodoWrite for complex tasks** - Track progress
5. **Explore when confused** - Use Task tool with Explore agent
6. **Create spec doc before starting** - Understand context
7. **Test incrementally** - Don't make many changes at once
8. **Validate schemas** - Use MCP tools to check table structure
9. **Keep it simple** - Don't over-engineer
10. **Use `meta` not `metaData`** - v5 renamed this
11. **Use `result` and `query` destructuring** - v5 grouped return values
12. **Leverage advanced query features** - aggregate, groupBy, having for analytics
13. **Know your filter operators** - 20+ operators (eq, in, between, containss, etc.)
14. **Storage provider uses `bucketName`** - Not `bucket` in meta
15. **Use `dataProviderName`** - Specify which provider (storage, functions, app, user, analytics)
16. **All 8 providers are configured** - See `/src/providers/refineProviders.ts`
17. **Import types from refineProviders** - `import type { TaruviUser, TaruviMeta } from "./providers/refineProviders"`

This is a **Refine.dev v5 project** - leverage the framework's hooks and patterns rather than reinventing CRUD operations.


## Pre-Work Checklist

### Before Starting Any Task:

1. **Create a Project Spec Document** - Run exploration, document resources/providers/auth flow, identify dependencies, map affected files
2. **Read Relevant Files** - Always use Read tool before editing, check existing patterns
3. **Plan with TodoWrite** - Break down complex tasks into steps, track progress

### Notification Rule

- Use the app's existing Refine notification integration via `useNotificationProvider` from `@refinedev/mui`
- Do not create custom notification systems, ad hoc snackbars, or alternate toast providers when implementing feedback
- When adding success/error feedback, wire it through the existing notification provider already configured in `/src/App.tsx`

### Browser errors → `logs/frontend.ndjson`

When the user reports a browser problem, read `logs/frontend.ndjson` instead of asking them to open DevTools. It's NDJSON — one event per line with `timestamp`, `source`, `text`, `session_id`, and for network errors `method`/`url`/`status`. Secrets are redacted server-side.

After shipping a fix, truncate before asking the user to re-test so the next reproduction is unambiguous: `: > logs/frontend.ndjson`.

If the file is missing, no errors have been captured yet — ask the user to reproduce the issue once, then re-read.

## Mandatory Taruvi Preflight

For any task involving Taruvi, Refine + Taruvi, `@taruvi/sdk`, or `@taruvi/refine-providers`:

1. You MUST open and read `.codex/skills/taruvi-app-developer/SKILL.md` first — it routes you to the right module skills.
2. If `.codex/skills/taruvi-app-developer/SKILL.md` is missing, inform the user to install skills by running `npx skills add Taruvi-ai/taruvi-skills`.
3. Follow its Step 4 to load all relevant module skills before writing any code.

Do not implement from memory.
Do not treat prior knowledge as sufficient.
If these files are unavailable, stop and say so.

## Project Overview

This is a **Refine.dev v5** project - a React-based framework for building admin panels, dashboards, and internal tools. Refine provides a collection of hooks and components that abstract CRUD operations and integrate with various backend services.

**CRITICAL:** This project uses **Refine v5** which has significantly different hook syntax from v4. Always use the v5 patterns documented in the "[IMPORTANT: Refine v5 Syntax Changes](#important-refine-v5-syntax-changes)" section below.

**When confused or need clarification:** Use the Task tool with `subagent_type='Explore'` and set thoroughness to "medium" or "very thorough" to understand the codebase patterns before making changes.

## IMPORTANT: Refine v5 Syntax Changes

**This project uses Refine v5** - Hook syntax has changed significantly from v4.

### Critical Hook Return Value Changes

#### Data Hooks (useList, useOne, useMany, useShow, useInfiniteList)

```typescript
// ❌ WRONG (v4)
const { data, isLoading, isError } = useList({ resource: "posts" });
const posts = data.data;

// ✅ CORRECT (v5)
const { result, query: { isLoading, isError } } = useList({ resource: "posts" });
const posts = result.data;
```

**useOne/useMany/useShow - Simplified result:**
```typescript
// ❌ v4: const { data } = useOne(...); const user = data.data;
// ✅ v5:
const { result, query: { isLoading } } = useOne({ resource: "users", id: 1 });
const user = result;  // No need for .data
```

**useInfiniteList:**
```typescript
// ✅ v5:
const { result, query: { fetchNextPage, isLoading } } = useInfiniteList();
const posts = result.data;
```

#### Mutation Hooks (useCreate, useUpdate, useDelete, useUpdateMany, useDeleteMany)

```typescript
// ❌ v4: const { isPending, isError, mutate } = useUpdate();
// ✅ v5:
const { mutation: { isPending, isError }, mutate } = useUpdate();
// Or: const { mutate, mutation } = useUpdate(); if (mutation.isPending) { ... }
```

#### Table Hooks (useDataGrid, useTable, useSimpleList)

```typescript
// ❌ v4: const { tableQueryResult, setCurrent, current } = useDataGrid();
// ✅ v5: const { tableQuery, setCurrentPage, currentPage } = useDataGrid();

const { dataGridProps, tableQuery, result } = useDataGrid({ resource: "blog_posts" });
```

### Parameter Name Changes & v4→v5 Migration

| ❌ Old (v4) | ✅ New (v5) | Example |
|------------|------------|---------|
| `metaData` | `meta` | `useList({ meta: { foo: "bar" } })` |
| `sorter` or `sort` | `sorters` | `useList({ sorters: [{ field: "id", order: "desc" }] })` |
| `hasPagination: false` | `pagination: { mode: "off" }` | `useList({ pagination: { mode: "off" } })` |
| `initialCurrent` | `pagination: { currentPage: 1 }` | `useTable({ pagination: { currentPage: 1 } })` |
| `initialPageSize` | `pagination: { pageSize: 20 }` | `useTable({ pagination: { pageSize: 20 } })` |
| `resourceName` | `resource` | `useImport({ resource: "posts" })` |
| `isLoading` (mutations) | `isPending` | `mutation.isPending` |
| `useResource("posts")` | `useResourceParams({ resource: "posts" })` | Resource introspection |
| `ignoreAccessControlProvider` | `accessControl={{ enabled: false }}` | `<CreateButton accessControl={{ enabled: false }} />` |
| `options: { label: "..." }` | `meta: { label: "..." }` | Resource config in `<Refine>` |
| `type AuthBindings` | `type AuthProvider` | `import { type AuthProvider } from "@refinedev/core"` |
| `type RouterBindings` | `type RouterProvider` | `import { type RouterProvider } from "@refinedev/core"` |

### Filter Configuration Changes

```typescript
// ❌ v4: useList({ config: { filters: [...] } });
// ✅ v5 - Direct:
useList({ filters: [{ field: "status", operator: "eq", value: "active" }] });
// ✅ v5 - Structured (for tables):
useTable({
  filters: {
    initial: [{ field: "status", operator: "eq", value: "draft" }],
    permanent: [{ field: "deleted", operator: "eq", value: false }],
    defaultBehavior: "replace",  // or "merge"
  }
});
```

### Pagination Configuration

```typescript
// ❌ v4: useList({ hasPagination: false });
// ✅ v5: useList({ pagination: { mode: "off" } });
// Modes: "off", "server" (default), "client"
useList({ pagination: { mode: "server", currentPage: 1, pageSize: 20 } });
```

### Navigation Changes

```typescript
// ❌ v4: const { push, goBack } = useNavigation();
// ✅ v5:
import { useGo } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
const go = useGo();
go({ to: "/tasks/new", type: "push" });  // or "replace"
const navigate = useNavigate();
navigate(-1);  // Go back
```

### Resource Introspection Changes

```typescript
// ❌ WRONG (v4)
import { useResource } from "@refinedev/core";
useResource("posts");

// ✅ CORRECT (v5)
import { useResourceParams } from "@refinedev/core";
useResourceParams({ resource: "posts" });
```

### Access Control Props

```typescript
// ❌ WRONG (v4)
<CreateButton ignoreAccessControlProvider />

// ✅ CORRECT (v5)
<CreateButton accessControl={{ enabled: false }} />
```

### Resource Configuration

```typescript
// ❌ WRONG (v4)
<Refine
  resources={[{
    name: "posts",
    options: { label: "Blog Posts" }
  }]}
/>

// ✅ CORRECT (v5)
<Refine
  resources={[{
    name: "posts",
    meta: { label: "Blog Posts", canDelete: true, icon: <PostIcon /> }
  }]}
/>
```

### Type Import Changes

```typescript
// ❌ WRONG (v4)
import { type AuthBindings, type RouterBindings } from "@refinedev/core";

// ✅ CORRECT (v5)
import { type AuthProvider, type RouterProvider } from "@refinedev/core";
```

### Complete v5 Hook Examples

**List Page with useDataGrid:**
```typescript
import { useDataGrid } from "@refinedev/mui";

export const BlogPostList = () => {
  const { dataGridProps, tableQuery } = useDataGrid({
    resource: "blog_posts",
    pagination: { mode: "server", pageSize: 10 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    filters: { permanent: [{ field: "deleted", operator: "eq", value: false }] },
  });

  if (tableQuery.isLoading) return <Loading />;
  if (tableQuery.isError) return <Error />;

  return <DataGrid {...dataGridProps} />;
};
```

**Show Page with useShow + useOne:**
```typescript
import { useShow, useOne } from "@refinedev/core";

export const BlogPostShow = () => {
  const { result, query: { isLoading } } = useShow({ resource: "blog_posts" });
  const post = result;

  const { result: category, query: { isLoading: categoryLoading } } = useOne({
    resource: "categories",
    id: post?.category_id,
    queryOptions: { enabled: !!post?.category_id },
  });

  if (isLoading || categoryLoading) return <Loading />;

  return (
    <Show>
      <TextField label="Title" value={post?.title} />
      <TextField label="Category" value={category?.title} />
    </Show>
  );
};
```

**Create/Update with Mutations:**
```typescript
import { useCreate, useUpdate } from "@refinedev/core";

export const BlogPostForm = ({ id }: { id?: string }) => {
  const { mutate: createPost, mutation: createMutation } = useCreate();
  const { mutate: updatePost, mutation: updateMutation } = useUpdate();

  const handleSubmit = (values: any) => {
    if (id) {
      updatePost({ resource: "blog_posts", id, values, meta: { foo: "bar" } });
    } else {
      createPost({ resource: "blog_posts", values });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</button>
    </form>
  );
};
```

### Migration Helper

1. `metaData` → `meta`
2. `sorter` → `sorters`
3. `hasPagination: false` → `pagination: { mode: "off" }`
4. `{ data, isLoading }` → `{ result, query: { isLoading } }`
5. `{ isPending }` → `{ mutation: { isPending } }`
6. `useNavigation` → `useGo` + `useNavigate`
7. `useResource` → `useResourceParams`

**Automated migration:** `npx @refinedev/codemod@latest refine4-to-refine5`

## Environment Configuration

```env
# .env.local
TARUVI_SITE_URL=http://tenant1.127.0.0.1.nip.io:8000
TARUVI_API_KEY=secret
TARUVI_APP_SLUG=sample-app
```

```typescript
// src/taruviClient.ts
import { Client } from "@taruvi/sdk";
export const taruviClient = new Client({
  apiUrl: __TARUVI_SITE_URL__,
  apiKey: __TARUVI_API_KEY__,
  appSlug: __TARUVI_APP_SLUG__,
});
// Used by all providers. Direct SDK: taruviClient.httpClient.get("api/...");
```

## MCP Tools Reference

| Category | Tools |
|----------|-------|
| **Schema** | `create_update_schema`, `get_datatable_schema`, `list_datatables` |
| **Data** | `query_datatable_data`, `upsert_datatable_data`, `delete_datatable_data` |
| **Analytics** | `list_queries`, `get_query`, `create_query`, `execute_query` |
| **Functions** | `list_functions`, `create_update_function`, `execute_function` |
| **Storage** | `list_buckets`, `create_bucket`, `list_objects` |
| **Secrets** | `list_secrets`, `create_secret`, `get_secret` |

All prefixed with `mcp__taruvi__`.

Follow UI Guidelines from UI_Guidelines.md

### Navkit Integration
- Global navigation bar is 60px height
- Custom Sider component accounts for this offset
- Styles in `/src/components/sider/index.tsx`

---
