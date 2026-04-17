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

---
