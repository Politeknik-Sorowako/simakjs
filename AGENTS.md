# SIMAK Vokasi — AI Agent Coding Standards

All AI agents operating on this codebase MUST follow these guidelines. Violations will cause CI/CD failures, merge conflicts, or deployment breakage.

---

## 1. Project Overview & CI/CD

- **Stack**: Bun monorepo (`apps/backend`: Elysia + Drizzle ORM + Postgres, `apps/frontend`: SolidJS + Vite + Tailwind), Biome v2.5.2.
- **CI/CD & Deployment Workflow**: Primary deployment MUST go through GitHub Actions workflows. NEVER push directly to `development` (staging) or `main` (production) branches. All changes MUST be submitted via a Pull Request (PR) targeting `development` or `main`.
- **NEVER delete `development` or `main` branches**: NEVER merge PRs with `--delete-branch` when the head branch is `development` or `main` (e.g. deploy-style PRs `development -> main`). These branches are the permanent source of truth for staging/production and MUST always exist on the remote. Only delete short-lived feature/hotfix branches. To merge a PR whose head is a protected branch, use `gh pr merge <N> --merge` WITHOUT `--delete-branch`.
- **Pre-commit Checks**: Always run linting and strict type checks before committing:
  ```bash
  bun run lint
  cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json
  cd apps/frontend && bunx tsc --noEmit
  ```

---

## 2. TypeScript & Type System

- **Strict Mode**: Mandatory across both backend and frontend (`"strict": true`).
- **No `any` Type**: `noExplicitAny` is set to `"error"` in biome.json. NEVER use `any` type in new code. Use `unknown`, `SafeAny` (`Record<string, unknown>`), or proper type annotations instead.
- **Framework Type Exceptions**: The only allowed `any` usages are:
  - `Promise<any>` return types on Elysia controller methods (backend only)
  - `AuthContext<any>` generic parameters (backend only)
  - These must have `// biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement` comments
- **Type Reuse**: Import and reuse exported controller/service types for state signals and component props instead of redefining inline object types.
- **Error Handling**: Use explicit error typing: `catch (e: unknown)` with `e instanceof Error ? e.message : 'Unknown error'`. Never use `catch (e: any)`.

---

## 3. Backend Development

- **Controllers**: Always use static methods destructuring `AuthContext`, check `getCurrentUser()` for auth/roles first, and wrap logic in try/catch returning `{ error }` with appropriate status code.
- **Services & DB**: Always static methods. Use Drizzle ORM with explicit `where` clauses (never fetch unbounded tables). Throw standard `Error` instances for business logic failures.
- **Data & File Operations**: Process bulk imports/CSV row-by-row with individual error handling (do not wrap entire imports in a single DB transaction). Use character-by-character CSV parsing to respect quoted newlines. Use native Node APIs (`node:fs/promises`) instead of shell commands.

---

## 4. Frontend Development (SolidJS)

- **Component Structure**: Export standard function declarations as `default` wrapped inside `<MainLayout>`.
- **Reactivity & State**: Use SolidJS primitives (`createSignal`, `createResource`) instead of React hooks.
- **List Rendering & Types**: When using `<For>` components over dynamic API data, use named interfaces or `SafeAny` to prevent strict flow component type errors.
- **Eden Date Handling**:
  - **`date()` columns** (calendar-date only, e.g. `tanggal`, `tanggalLahir`, `tanggalBimbingan`): MUST use Drizzle `date('col', { mode: 'string' })` and Eden schema `t.String()` (or `t.Union([t.String(), t.Null()])`). Values are plain `'YYYY-MM-DD'` strings on the wire — no timezone conversion. Display them directly or format client-side; never round-trip through `new Date(...).toISOString()` (causes off-by-one day bugs in non-UTC timezones).
  - **`timestamp()` columns** (createdAt/updatedAt/...): MUST use `t.Date()`, not `t.String()` — otherwise Elysia rejects valid `Date` values at runtime (422). Eden/TS infers these as `Date`, but the JSON wire format is still an ISO string; sanitize on the frontend when needed.
  - **Never use** `new Date(x).toISOString().split('T')[0]` to produce a calendar date. Use local-timezone-safe formatting (`getFullYear()/getMonth()/getDate()`) for "today", or pass the date string through unchanged.

---

## 5. Database, Git & Security

- **Database**: Never alter existing migration files or execute `drizzle-kit push` in production. Generate and apply migrations via `bun run db:generate` and `bun run db:safe-migrate`. All migration SQL files MUST be idempotent to prevent deployment crashes (always use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and safe constraint checks). **ALWAYS perform a full database backup (`pg_dump` / automated snapshot) before deploying to staging or production environments.**
- **Git & Deployment Operations**: Follow conventional commits (`type(scope): description`). ALWAYS create a Pull Request (PR) towards `development` (for staging) or `main` (for production) before deploying. Direct pushes to `development` or `main` are strictly prohibited. Always clear sandbox tokens using `env -u GITHUB_TOKEN git ...` before any remote git operation.
- **Security**: Never commit `.env` or secrets. Enforce password hashing (bcrypt, cost 12), and use explicit CORS origin lists instead of wildcards.

---

## 6. AI Agent Communication & Inspection

1. Provide direct answers focused on the core issue without pleasantries.
2. Show patched diff code snippets instead of reprinting whole files. Keep explanations to 2–3 sentences.
3. Target file inspection tools specifically to required paths.
4. ALWAYS create a new Pull Request (PR) towards `development` (staging) or `main` (production) branch when implementing features or hotfixes. Never push directly to target deployment branches.
5. Ensure `bun run lint` and `bunx biome ci .` pass before committing, pushing, or opening a PR.

# Agent Roles & Workflow Policy

## Planner & Orchestrator (Antigravity Agent)

- Membaca konteks proyek dari `@CODEBASE_CONTEXT.md`.
- Membagi fitur menjadi subunit tugas kecil yang terisolasi.
- Mengeksekusi pengujian (testing, linting, build check) di lingkungan sandbox.
- Hanya mengirim log error ke OpenCode jika pengujian gagal (max 3x retry loop).

## Executor Engine (OpenCode CLI)

- Memproses kode berdasarkan tugas spesifik dari Antigravity.
- Menggunakan model `DeepSeek V4 Flash` untuk implementasi dasar.
- Hanya merujuk file yang relevan untuk menghemat context window.
