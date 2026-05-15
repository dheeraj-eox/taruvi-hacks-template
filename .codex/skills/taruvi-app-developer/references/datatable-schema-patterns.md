# Datatable schema patterns (Frictionless + Taruvi extensions)

The full shape of the `datapackage` argument to `create_update_schema`. Taruvi follows [Frictionless Data Package](https://specs.frictionlessdata.io/data-package/) plus several Taruvi-specific extensions.

Source of truth: <https://test-docs.taruvi.cloud/docs/data-service/guides/migrations> (schema evolution), `/hierarchy`, `/graph-traversal`, `/relationships`, `/imports`.

## Minimal shape

```json
{
  "resources": [
    {
      "name": "orders",
      "schema": {
        "fields": [
          {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "title", "type": "string", "constraints": {"maxLength": 255}},
          {"name": "created_at", "type": "datetime"}
        ],
        "primaryKey": ["id"]
      }
    }
  ]
}
```

**Prefer UUID IDs for new tables** (`"type": "string", "format": "uuid"`). Integer IDs work but UUIDs are the recommended default.

One call can create or update many tables by adding more entries to `resources[]`.

## Field types

| `type` | Postgres | Notes |
|---|---|---|
| `string` | `TEXT` | Use `constraints.maxLength` for varchar-like bound |
| `integer` | `INTEGER` | |
| `number` | `NUMERIC` | |
| `boolean` | `BOOLEAN` | |
| `date` | `DATE` | ISO 8601 |
| `datetime` | `TIMESTAMP WITH TIME ZONE` | ISO 8601 |
| `object` | `JSONB` | arbitrary JSON object |
| `array` | `JSONB` | arbitrary JSON array |

## Field options

Beyond `name` and `type`, fields can carry:

- `format` — Frictionless format hint. Common values: `uuid`, `email`, `uri`, `date`, `datetime`. Drives type coercion and validation.
- `default` — default value applied at insert time, e.g. `{"name": "status", "type": "string", "default": "active"}`. Required when adding a NOT NULL column to a populated table (see Schema evolution).
- `constraints` — see below.

## Constraints

Per-field `constraints` object:

- `required: true` → `NOT NULL`
- `unique: true` → `UNIQUE` index
- `maxLength: N` → `CHECK (length(field) <= N)`
- `minimum` / `maximum` → `CHECK`
- `pattern: "..."` → `CHECK` against regex
- `enum: [...]` → `CHECK IN (...)`

## Foreign keys (`foreignKeys`)

```json
{
  "name": "line_items",
  "schema": {
    "fields": [
      {"name": "id", "type": "string", "format": "uuid"},
      {"name": "order_id", "type": "string", "format": "uuid"}
    ],
    "primaryKey": ["id"],
    "foreignKeys": [
      {
        "fields": ["order_id"],
        "reference": {
          "resource": "orders",
          "fields": ["id"]
        },
        "x-actions": {"onDelete": "CASCADE"}
      }
    ]
  }
}
```

FK references must point to a table in the same datapackage or an already-materialized one. If a multi-resource datapackage contains FKs across its own entries, order `resources[]` so referenced tables come first. There's no schema-level declaration for reverse / one-to-many / many-to-many — those are inferred from the child's FK at query time (`?activities.subject__contains=...`, `populate=activities`, etc.). For many-to-many, declare a junction table with two FKs. Only `onDelete` is documented under `x-actions`.

Default `onDelete` when omitted: `RESTRICT`.

### Referential delete actions (`x-actions.onDelete`)

Control what happens when a referenced row is deleted:

| Value | Behavior |
|---|---|
| `RESTRICT` | Block delete if references exist (default) |
| `CASCADE` | Delete referencing rows |
| `SET NULL` | Set FK column to NULL (field must be nullable) |
| `SET DEFAULT` | Set FK column to its default (field must have a default) |
| `NO ACTION` | Same as RESTRICT but checked at end of transaction |

System resources `auth_user` and `storage_objects` (bucket file metadata) can be used as `reference.resource` targets — see Conventions below.

## Indexes (Taruvi extension: `indexes`)

```json
{
  "schema": {
    "fields": [...],
    "primaryKey": ["id"],
    "indexes": [
      {"name": "idx_created", "fields": ["created_at"], "type": "btree"},
      {"name": "idx_cust_status", "fields": ["customer_id", "status"], "unique": false},
      {"name": "idx_metadata", "fields": ["metadata"], "type": "gin"},
      {"name": "idx_email_lower", "expression": "LOWER(email)", "unique": true},
      {"name": "idx_active_only", "fields": ["created_at"], "where": "is_active = true"}
    ]
  }
}
```

Types: `btree` (default), `hash`, `gin`, `gist`, `brin`. GIN is required for JSONB search.

Index properties: `name` (required), `fields` or `expression` (one required), `type`/`method`, `unique`, `where` (partial index condition), `using`, `comment`.

## Search fields (Taruvi extension: `search_fields`)

Declares which fields are searchable via the `?search=<query>` URL parameter when consumed via the data API.

```json
{
  "schema": {
    "fields": [...],
    "search_fields": [
      {"field": "title", "weight": "A"},
      {"field": "description", "weight": "B"}
    ]
  }
}
```

Weights are Postgres tsvector weight letters: `A` (highest), `B`, `C`, `D` (lowest). Plain strings (without a weight) default to `D`.

Options: `search_language` (default `"english"`) and `search_config` (default `"english"`) control the Postgres text search configuration. Set these for non-English content:

```json
{
  "search_language": "spanish",
  "search_config": "spanish",
  "search_fields": ["titulo", {"field": "cuerpo", "weight": "B"}]
}
```

## Hierarchy and graph

Both hierarchy and graph relationships are stored in the same auto-generated `<table>_edges` companion table (`from_id`, `to_id`, `type`, `metadata`, `created_at`). Declare the desired semantics on the resource:

```json
{
  "name": "employees",
  "schema": {
    "fields": [...],
    "primaryKey": ["id"],
    "hierarchy": true,
    "graph": {
      "enabled": true,
      "types": [
        {
          "name": "manager",
          "inverse": "reports",
          "constraints": {"max_outgoing": 1},
          "description": "Primary reporting line"
        },
        {
          "name": "mentor",
          "metadata": {"fields": [{"name": "since", "type": "date"}]}
        }
      ]
    }
  }
}
```

- `hierarchy: true` (boolean flag) — enables hierarchy query semantics (`include=descendants|ancestors` with `depth`).
- `graph.enabled: true` — enables typed edges via the `<table>_edges` companion table.
- `graph.types[]` — declare each allowed edge type. Use it for typed metadata fields, edge constraints, and an `inverse` label:
  - `inverse` — semantic name for the reverse direction. Documentation only; traversal still uses `include=ancestors|descendants` plus the chosen `relationship_type`.
  - `metadata.fields` — typed fields stored on each edge of this type, queryable via `datatable_edges`.
  - `constraints.max_outgoing` / `constraints.max_incoming` — cap edges per node (e.g. `max_outgoing: 1` enforces single-manager / tree shape).

For a pure tree (single implicit edge type), `hierarchy: true` alone is enough; for a DAG with multiple typed relationships, add the `graph` block. Server caps traversal depth via `DATA_SERVICE_GRAPH_MAX_DEPTH` (default 10). Manipulate edges with `datatable_edges`.

## Schema evolution

Resubmitting a datapackage via `create_update_schema` (or `PATCH` on the resource) triggers a migration. The data service classifies each change as safe or destructive:

| Safe | Destructive — require `allow_data_loss=True` |
|---|---|
| Add nullable column | Add NOT NULL column without a default |
| Add column with `default` | Narrow a column type (e.g. TEXT → VARCHAR(10)) |
| Drop column (data lost; opt-in via the destructive flag) | Incompatible type cast (e.g. TEXT → INTEGER) |
| Make column nullable | Remove a NOT NULL constraint |
| Widen a column type | |
| Add foreign key, index | |
| Rename column with `x-rename-from` | |

### Column rename (`x-rename-from`)

```json
{"name": "email_address", "type": "string", "x-rename-from": "email"}
```

Without the hint, the materializer treats it as drop + add and loses data.

### Adding a NOT NULL column to a populated table

Either supply a `default` (single safe step) or run the three-step pattern: add nullable → populate via `datatable_data` upsert / raw SQL → resubmit with `required: true`.

### Revision history and rollback

Every schema operation is recorded with `revision_id`, `executed_sql`, and an auto-generated `rollback_sql`. The data service exposes a rollback endpoint per resource (`POST /api/apps/{slug}/datatables/{table}/rollback/` with `{"revision_id": "..."}`). DDL statements have a server-side timeout of ~30s — split large refactors into smaller steps.

Rollback caveats: dropped column data is not recoverable; an already-rolled-back operation cannot be rolled back again; type conversions whose backward cast would fail are not rollable.

### Imports vs schema creation

The import workflow uses the same Frictionless data package shape. The REST endpoint accepts `?materialize=true` to create physical tables immediately; without it, only metadata is registered. `create_update_schema` (MCP) always materializes.

## Conventions

- **Soft delete** — if a table has a field named `is_deleted` (boolean), `delete` operations through the data service set the flag instead of removing the row.
- **Auto-managed timestamps** — `created_at` and `updated_at` are populated by the data service when those columns exist. Declare them as `datetime` fields; no extra schema flag needed.
- **System FK targets** — `auth_user` and `storage_objects` are valid `reference.resource` values for cross-cutting FKs.

## Populate (FK auto-expansion at query time)

Populate is a **query-time** feature, not a schema feature. To support it, just declare FKs. Consumers (Refine providers, MCP `datatable_data`) can request populated fields via:

```
datatable_data(action="query", table_name="line_items", populate="order,order.customer")
```

Dots traverse nested FKs. Use `*` to populate all one-hop FKs.

## Common mistakes

See also: Gotchas in SKILL.md for cross-cutting warnings (field dropping, policy replacement, etc.).

1. **Omitting `primaryKey`** — every table must declare one. Single-field PK: `"primaryKey": ["id"]`. Composite: `"primaryKey": ["tenant_id", "order_id"]`.
2. **Narrowing or changing a column type in place** — classified destructive; rejected without `allow_data_loss=True`. Validate existing values fit the new type before forcing the flag, or add a new column, migrate, drop.
3. **Adding a required column to a populated table without a `default`** — fails unless you set `allow_data_loss=True`. Prefer the safe pattern: declare with a `default` (one step), or add nullable → populate → resubmit with `required: true`.
4. **Foreign key to a not-yet-materialized table in the same datapackage** — order `resources[]` so referenced tables come first, or submit them in separate `create_update_schema` calls.
5. **Forgetting `indexes` on frequently-filtered columns** — Taruvi only auto-indexes the PK. Add explicit indexes for filter/sort columns; required for FK columns you'll traverse via `?fk.field=...`.
6. **Renaming without `x-rename-from`** — the materializer treats a name change as drop + add and loses the column data. Always include the hint.

## Worked example: blog schema

```json
{
  "resources": [
    {
      "name": "authors",
      "schema": {
        "fields": [
          {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "name", "type": "string", "constraints": {"required": true, "maxLength": 255}},
          {"name": "bio", "type": "string"}
        ],
        "primaryKey": ["id"]
      }
    },
    {
      "name": "posts",
      "schema": {
        "fields": [
          {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "author_id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "title", "type": "string", "constraints": {"required": true, "maxLength": 500}},
          {"name": "body", "type": "string"},
          {"name": "status", "type": "string", "constraints": {"enum": ["draft", "published"]}},
          {"name": "tags", "type": "array"},
          {"name": "published_at", "type": "datetime"},
          {"name": "created_at", "type": "datetime", "constraints": {"required": true}}
        ],
        "primaryKey": ["id"],
        "foreignKeys": [
          {"fields": ["author_id"], "reference": {"resource": "authors", "fields": ["id"]}}
        ],
        "indexes": [
          {"name": "idx_status_pub", "fields": ["status", "published_at"]},
          {"name": "idx_author", "fields": ["author_id"]}
        ],
        "search_fields": [
          {"field": "title", "weight": "A"},
          {"field": "body", "weight": "B"}
        ]
      }
    }
  ]
}
```
