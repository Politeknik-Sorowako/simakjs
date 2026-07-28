# SIMAK Vokasi — AI Agent Coding Standards

All AI agents operating on this codebase MUST follow these guidelines. Violations will cause CI/CD failures, merge conflicts, or deployment breakage.

---

## 1. Project Overview & CI/CD
- **Stack**: Bun monorepo (`apps/backend`: Elysia + Drizzle ORM + Postgres, `apps/frontend`: SolidJS + Vite + Tailwind), Biome v2.5.2.
- **CI/CD Workflow**: Primary deployment MUST go through GitHub Actions workflows. Never skip or bypass CI/CD.
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

---

## 5. Database, Git & Security
- **Database**: Never alter existing migration files or execute `drizzle-kit push` in production. Generate and apply migrations via `bun run db:generate` and `bun run db:safe-migrate`.
- **Git Operations**: Follow conventional commits (`type(scope): description`). Always clear sandbox tokens using `env -u GITHUB_TOKEN git ...` before any remote git operation.
- **Security**: Never commit `.env` or secrets. Enforce password hashing (bcrypt, cost 12), and use explicit CORS origin lists instead of wildcards.

---

## 6. AI Agent Communication & Inspection
1. Provide direct answers focused on the core issue without pleasantries.
2. Show patched diff code snippets instead of reprinting whole files. Keep explanations to 2–3 sentences.
3. Target file inspection tools specifically to required paths.
4. Create new PRs towards `development` branch when implementing features in new agent conversations.
5. Ensure `bun run lint` and `bunx biome ci .` pass before committing or pushing.
