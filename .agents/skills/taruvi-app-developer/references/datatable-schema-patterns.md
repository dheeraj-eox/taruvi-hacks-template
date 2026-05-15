# Datatable schema patterns (Frictionless + Taruvi extensions)

The full shape of the `datapackage` argument to `create_update_schema`. Taruvi follows [Frictionless Data Package](https://specs.frictionlessdata.io/data-package/) plus several Taruvi-specific extensions.

This doc is built around **one annotated example** that exercises every pattern. Each pattern below the example is a deeper reference. Use the example as a copy-paste starting point and jump to a section when you need the rules.

---

## The annotated example

A simple project-management schema with five tables. The `// →` arrows are inline pointers to the explanation sections — the JSON itself is valid if you strip them (the block is rendered as JSONC).

```jsonc
{
  "resources": [
    // ── 1) categories — self-referencing hierarchy + unique-expression index
    {
      "name": "categories",                            // → §1 Resources & primary keys
      "schema": {
        "fields": [
          {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}},     // → §2 Field types · §3 Constraints
          {"name": "parent_id", "type": "string", "format": "uuid"},                                  // → §4 Foreign keys
          {"name": "name", "type": "string", "constraints": {"required": true, "maxLength": 100, "unique": true}},
          {"name": "slug", "type": "string", "constraints": {"required": true, "maxLength": 100, "pattern": "^[a-z0-9-]+$"}},
          {"name": "metadata", "type": "object"},                                                     // → §2 JSONB
          {"name": "created_at", "type": "datetime", "constraints": {"required": true}}
        ],
        "primaryKey": ["id"],                                                                          // → §1
        "foreignKeys": [                                                                               // → §4
          {
            "fields": ["parent_id"],
            "reference": {"resource": "categories", "fields": ["id"]},
            "x-actions": {"onDelete": "SET NULL"}                                                      // → §4.1 Delete actions
          }
        ],
        "indexes": [
          {"name": "idx_categories_slug", "expression": "LOWER(slug)", "unique": true}                 // → §5 Indexes (expression + unique)
        ],
        "hierarchy": {"enabled": true, "self_reference": "parent_id"}                                  // → §7 Hierarchy
      }
    },

    // ── 2) projects — owner is auth_user, mixed types, partial + GIN indexes, search
    {
      "name": "projects",
      "schema": {
        "fields": [
          {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "owner_id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "category_id", "type": "string", "format": "uuid"},
          {"name": "title", "type": "string", "constraints": {"required": true, "maxLength": 200}},
          {"name": "description", "type": "string"},
          {"name": "status", "type": "string", "constraints": {"required": true, "enum": ["active", "on_hold", "completed", "archived"]}},    // → §3 enum
          {"name": "budget", "type": "number", "constraints": {"minimum": 0}},                          // → §3 minimum
          {"name": "completion_pct", "type": "integer", "constraints": {"minimum": 0, "maximum": 100}}, // → §3 min/max
          {"name": "settings", "type": "object"},
          {"name": "is_public", "type": "boolean"},
          {"name": "starts_on", "type": "date"},
          {"name": "created_at", "type": "datetime", "constraints": {"required": true}}
        ],
        "primaryKey": ["id"],
        "foreignKeys": [
          {
            "fields": ["owner_id"],
            "reference": {"resource": "auth_user", "fields": ["id"]},                                  // → §4.2 System-table FKs
            "x-actions": {"onDelete": "RESTRICT"}
          },
          {
            "fields": ["category_id"],
            "reference": {"resource": "categories", "fields": ["id"]},
            "x-actions": {"onDelete": "SET NULL"}
          }
        ],
        "indexes": [
          {"name": "idx_projects_owner_status", "fields": ["owner_id", "status"]},                     // → §5 Composite btree
          {"name": "idx_projects_settings", "fields": ["settings"], "type": "gin"},                    // → §5 GIN on JSONB
          {"name": "idx_projects_active_recent", "fields": ["created_at"], "where": "status = 'active'"} // → §5 Partial index
        ],
        "search_fields": [                                                                              // → §6 Search fields
          {"field": "title", "weight": "A"},
          {"field": "description", "weight": "C"}
        ]
      }
    },

    // ── 3) project_members — composite primary key + multiple FKs
    {
      "name": "project_members",
      "schema": {
        "fields": [
          {"name": "project_id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "user_id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "role", "type": "string", "constraints": {"required": true, "enum": ["owner", "editor", "viewer"]}},
          {"name": "joined_at", "type": "datetime", "constraints": {"required": true}}
        ],
        "primaryKey": ["project_id", "user_id"],                                                        // → §1 Composite PK
        "foreignKeys": [
          {
            "fields": ["project_id"],
            "reference": {"resource": "projects", "fields": ["id"]},
            "x-actions": {"onDelete": "CASCADE"}                                                        // → §4.1
          },
          {
            "fields": ["user_id"],
            "reference": {"resource": "auth_user", "fields": ["id"]},
            "x-actions": {"onDelete": "CASCADE"}
          }
        ]
      }
    },

    // ── 4) tasks — array + JSONB fields, graph with inverse + typed edge metadata
    {
      "name": "tasks",
      "schema": {
        "fields": [
          {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "project_id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "assignee_id", "type": "string", "format": "uuid"},
          {"name": "title", "type": "string", "constraints": {"required": true, "maxLength": 200}},
          {"name": "details", "type": "string"},
          {"name": "status", "type": "string", "constraints": {"required": true, "enum": ["todo", "in_progress", "review", "done"]}},
          {"name": "priority", "type": "string", "constraints": {"enum": ["low", "medium", "high"]}},
          {"name": "estimated_minutes", "type": "integer", "constraints": {"minimum": 0}},
          {"name": "tags", "type": "array"},                                                            // → §2 JSONB array
          {"name": "metadata", "type": "object"},
          {"name": "due_at", "type": "datetime"},
          {"name": "created_at", "type": "datetime", "constraints": {"required": true}}
        ],
        "primaryKey": ["id"],
        "foreignKeys": [
          {
            "fields": ["project_id"],
            "reference": {"resource": "projects", "fields": ["id"]},
            "x-actions": {"onDelete": "CASCADE"}
          },
          {
            "fields": ["assignee_id"],
            "reference": {"resource": "auth_user", "fields": ["id"]},
            "x-actions": {"onDelete": "SET NULL"}
          }
        ],
        "indexes": [
          {"name": "idx_tasks_project_status", "fields": ["project_id", "status"]},
          {"name": "idx_tasks_metadata", "fields": ["metadata"], "type": "gin"}
        ],
        "search_fields": [
          {"field": "title", "weight": "A"},
          {"field": "details", "weight": "B"}
        ],
        "graph": {                                                                                      // → §8 Graph
          "enabled": true,
          "types": [
            {"name": "blocks", "inverse": "blocked_by"},                                                // → §8.1 Inverse
            {"name": "relates_to", "metadata": {"fields": [{"name": "linked_at", "type": "datetime"}]}} // → §8.1 Typed edge metadata
          ]
        }
      }
    },

    // ── 5) task_attachments — FK to storage_objects (system table)
    {
      "name": "task_attachments",
      "schema": {
        "fields": [
          {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "task_id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "storage_object_id", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "uploaded_by", "type": "string", "format": "uuid", "constraints": {"required": true}},
          {"name": "caption", "type": "string", "constraints": {"maxLength": 280}},
          {"name": "uploaded_at", "type": "datetime", "constraints": {"required": true}}
        ],
        "primaryKey": ["id"],
        "foreignKeys": [
          {
            "fields": ["task_id"],
            "reference": {"resource": "tasks", "fields": ["id"]},
            "x-actions": {"onDelete": "CASCADE"}
          },
          {
            "fields": ["storage_object_id"],
            "reference": {"resource": "storage_objects", "fields": ["id"]},                            // → §4.2 storage_objects FK
            "x-actions": {"onDelete": "CASCADE"}
          },
          {
            "fields": ["uploaded_by"],
            "reference": {"resource": "auth_user", "fields": ["id"]},
            "x-actions": {"onDelete": "RESTRICT"}
          }
        ]
      }
    }
  ]
}
```

### What the example covers, at a glance

| Pattern | Where in the example | Reference |
|---|---|---|
| Resources + primary keys (single & composite) | `categories`, `project_members` | [§1](#1-resources--primary-keys) |
| Field types (string, integer, number, boolean, date, datetime, object/JSONB, array/JSONB) | spread across all five tables | [§2](#2-field-types) |
| Constraints (`required`, `unique`, `maxLength`, `pattern`, `enum`, `minimum`/`maximum`) | `categories.name`, `categories.slug`, `projects.status`, `projects.budget`, `projects.completion_pct`, `task_attachments.caption` | [§3](#3-constraints) |
| Foreign keys + delete actions (`CASCADE`, `SET NULL`, `RESTRICT`) | every table | [§4](#4-foreign-keys-foreignkeys) |
| FK to system tables (`auth_user`, `storage_objects`) | `projects.owner_id`, `tasks.assignee_id`, `task_attachments.storage_object_id`, `task_attachments.uploaded_by`, `project_members.user_id` | [§4.2](#42-foreign-keys-to-system-tables) |
| Self-referencing FK | `categories.parent_id` | [§4](#4-foreign-keys-foreignkeys) |
| Indexes (composite btree, GIN on JSONB, partial, expression with `unique`) | `projects.indexes`, `categories.indexes`, `tasks.indexes` | [§5](#5-indexes-taruvi-extension-indexes) |
| Search fields with weights | `projects.search_fields`, `tasks.search_fields` | [§6](#6-search-fields-taruvi-extension-search_fields) |
| Hierarchy (closure table) | `categories.hierarchy` | [§7](#7-hierarchy-parentchild-closure) |
| Graph with inverse and typed edge metadata | `tasks.graph` | [§8](#8-graph-many-to-many-with-edge-metadata) |
| Multi-table call (5 resources in one `create_update_schema`) | top-level `resources` array | [§1](#1-resources--primary-keys) |

The two patterns that don't appear inline (because they are about **evolving** an existing schema, not creating one) are covered in [§9 Column rename](#9-column-rename-x-rename-from) and [§10 Populate](#10-populate-fk-auto-expansion-at-query-time).

---

## §1 Resources & primary keys

- A single `create_update_schema` call accepts many tables — add them to `resources[]`. Order them so referenced tables (FK targets) come before referencing tables, or submit dependent batches in separate calls.
- Every table MUST declare a `primaryKey` (single field: `"primaryKey": ["id"]`; composite: `"primaryKey": ["project_id", "user_id"]`).
- **Prefer UUID IDs** (`"type": "string", "format": "uuid"`) for new tables. Integer IDs work but UUIDs are the recommended default.

Minimal valid table:

```json
{
  "name": "orders",
  "schema": {
    "fields": [
      {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}}
    ],
    "primaryKey": ["id"]
  }
}
```

## §2 Field types

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

## §3 Constraints

Per-field `constraints` object:

| Constraint | Generates |
|---|---|
| `required: true` | `NOT NULL` |
| `unique: true` | single-field `UNIQUE` index |
| `maxLength: N` | `CHECK (length(field) <= N)` |
| `minimum` / `maximum` | `CHECK (field >= …)` / `CHECK (field <= …)` |
| `pattern: "regex"` | `CHECK (field ~ 'regex')` |
| `enum: [...]` | `CHECK (field IN (...))` |

Compose freely: `{"required": true, "maxLength": 100, "pattern": "^[a-z0-9-]+$"}` is fine.

## §4 Foreign keys (`foreignKeys`)

```json
"foreignKeys": [
  {
    "fields": ["order_id"],
    "reference": {"resource": "orders", "fields": ["id"]},
    "x-actions": {"onDelete": "CASCADE"}
  }
]
```

FK targets must reference another table in the same datapackage or an already-materialized one. Self-references are allowed (see `categories.parent_id` in the example).

### §4.1 Delete actions (`x-actions.onDelete`)

| Value | Behavior |
|---|---|
| `RESTRICT` | Block delete if references exist (default) |
| `CASCADE` | Delete referencing rows |
| `SET NULL` | Set FK column to NULL (field must be nullable) |
| `SET DEFAULT` | Set FK column to its default (field must have a default) |
| `NO ACTION` | Same as RESTRICT but checked at end of transaction |

### §4.2 Foreign keys to system tables

You can FK directly to:

- `auth_user` — platform identity. Use for `owner_id`, `assignee_id`, `created_by`, etc. Never create your own user table.
- `storage_objects` — bucket file metadata. Use for attachment/upload references.

Both behave like any other FK target (see `projects.owner_id` and `task_attachments.storage_object_id` in the example).

## §5 Indexes (Taruvi extension: `indexes`)

Index entries support:

- `name` (required) — index name.
- `fields` or `expression` (exactly one required).
- `type` / `method` — `btree` (default), `hash`, `gin`, `gist`, `brin`. **GIN is required for JSONB search.**
- `unique` — single- or multi-field uniqueness; allowed on `expression` too.
- `where` — partial-index predicate.
- `using`, `comment` — passthrough.

Examples (all four pulled directly from the annotated schema):

```json
{"name": "idx_categories_slug",       "expression": "LOWER(slug)", "unique": true}
{"name": "idx_projects_owner_status", "fields": ["owner_id", "status"]}
{"name": "idx_projects_settings",     "fields": ["settings"], "type": "gin"}
{"name": "idx_projects_active_recent","fields": ["created_at"], "where": "status = 'active'"}
```

Taruvi does **not** auto-index anything beyond the PK — add explicit indexes for every column you filter or sort on.

## §6 Search fields (Taruvi extension: `search_fields`)

Declares which fields are searchable via the `?search=<query>` URL parameter when consumed via the data API.

```json
"search_fields": [
  {"field": "title", "weight": "A"},
  {"field": "description", "weight": "C"}
]
```

Weights are Postgres tsvector weight letters: `A` (highest), `B`, `C`, `D` (lowest). Plain string entries (without a weight) default to `D`.

### Non-English content

Set `search_language` and `search_config` to a Postgres text-search configuration:

```json
{
  "search_language": "spanish",
  "search_config": "spanish",
  "search_fields": ["titulo", {"field": "cuerpo", "weight": "B"}]
}
```

## §7 Hierarchy (parent/child closure)

```json
"hierarchy": {"enabled": true, "self_reference": "parent_id"}
```

Creates a closure table maintained automatically. Query descendants/ancestors via `datatable_data` meta or the graph API. The example uses this on `categories`; `parent_id` itself is also a normal self-referencing FK so deletes/cascades work as usual.

## §8 Graph (many-to-many with edge metadata)

```json
"graph": {"enabled": true, "edge_types": ["prerequisite", "related"]}
```

Creates an `<table>_edges` companion table. Use `datatable_edges` to manipulate edges. Each edge has `from_id`, `to_id`, `type`, `metadata` (JSONB), `created_by_id`, `created_at`.

### §8.1 Advanced graph: inverse + typed edge metadata

```json
"graph": {
  "enabled": true,
  "types": [
    {"name": "blocks", "inverse": "blocked_by"},
    {"name": "relates_to", "metadata": {"fields": [{"name": "linked_at", "type": "datetime"}]}}
  ]
}
```

- `inverse` — declares the reverse edge name. Querying `blocked_by` of node X returns nodes where X is `blocks`.
- `metadata.fields` — typed fields stored on each edge of this type, queryable via `datatable_edges`.

## §9 Column rename (`x-rename-from`)

For evolving an existing table without losing data. Send a follow-up `create_update_schema` where the renamed column declares its old name:

```json
{
  "name": "summary",
  "type": "string",
  "x-rename-from": "description"
}
```

The materializer drops the old column after copying data into the new one.

## §10 Populate (FK auto-expansion at query time)

Populate is a **query-time** feature, not a schema feature. As long as you declare FKs, consumers (Refine providers, MCP `datatable_data`) can expand them:

```
datatable_data(action="query", table_name="tasks", populate="project,project.category,assignee_id")
```

- Dots traverse nested FKs.
- `*` populates all one-hop FKs.

## §11 Common mistakes

See also: Gotchas in `SKILL.md` for cross-cutting warnings (field dropping, policy replacement, etc.).

1. **Omitting `primaryKey`** — every table must declare one. Single-field: `"primaryKey": ["id"]`. Composite: `"primaryKey": ["tenant_id", "order_id"]`.
2. **Changing a column type in place** — usually works but may fail on existing data. Safer to add a new column, migrate via `datatable_data` upserts or raw SQL, then drop the old column.
3. **Adding a `required` constraint to a column that already has NULLs** — fails. Backfill first or add a default.
4. **Foreign key to a not-yet-materialized table in the same datapackage** — order `resources[]` so referenced tables come first, or submit them in separate `create_update_schema` calls.
5. **Forgetting `indexes` on frequently-filtered columns** — Taruvi won't add indexes automatically beyond the PK. Add explicit indexes for every filter/sort column.
6. **Using `gin` on a non-JSONB field** — GIN is for JSONB (and tsvector); use `btree` for normal columns.
7. **Setting `onDelete: "SET NULL"` on a `required` field** — contradictory; the materializer will reject it.
