# CLAUDE.md

This project uses [`AGENTS.md`](AGENTS.md) as its single source of agent guidance — it covers Refine v5 patterns, the Taruvi preflight, the UI design system, deployment, and more.

**Read [`AGENTS.md`](AGENTS.md) before starting any task.**

Two sections deserve attention up front:

- **Mandatory UI / Design System Preflight** — anything that renders or styles UI: read [`UI_Guidelines.md`](UI_Guidelines.md), import `taruviTokens` from [`themeOptions.ts`](themeOptions.ts), prefer plain MUI components (overrides are already applied), use `*Rounded` icon variants.
- **Mandatory Taruvi Preflight** — anything touching Taruvi / `@taruvi/sdk` / `@taruvi/refine-providers`: read `.codex/skills/taruvi-app-developer/SKILL.md` first and load the module skills it routes you to.
