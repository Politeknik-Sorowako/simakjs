# SIMAK Vokasi — AI Agent Coding Standards

> All AI agents operating on this codebase MUST follow these rules.
> Violations will cause CI/CD failures, merge conflicts, or deployment breakage.

---

## 1. Project Overview

**Stack:**
- Runtime: Bun (monorepo with workspaces)
- Backend: Bun + Elysia + Drizzle ORM + PostgreSQL 15
- Frontend: SolidJS + Vite + TailwindCSS
- Linting: Biome v2.5.2
- CI/CD: GitHub Actions → SSH deploy to VPS

**Monorepo structure:**
```
apps/
  backend/    # Elysia API server (port 3000/3001)
  frontend/   # SolidJS SPA (port 80/8080/8082)
```

**Environment ports:**

| Service | Production | Staging |
|---------|-----------|---------|
| DB | 5433 | 5434 |
| Backend | 3000 | 3001 |
| Frontend | 8080 | 8082 |

---

## 2. CI/CD Pipeline Requirements

### Deployment MUST go through CI/CD first

- **Primary**: GitHub Actions workflows (`deploy-staging.yml` / `deploy-production.yml`)
- **Fallback only**: SSH + deploy scripts (`deploy-staging.sh` / `deploy.sh`)
- Never skip CI/CD unless the pipeline is broken. If CI/CD fails, fix the pipeline — do not bypass it.

### CI pipeline checks (must all pass):

```bash
# 1. Lint (Biome)
bunx biome ci .

# 2. Type check (backend only, strict mode)
cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json

# 3. Frontend build
cd apps/frontend && bun run build

# 4. Docker build (both images)
docker build -f apps/backend/Dockerfile .
docker build -f apps/frontend/Dockerfile .
```

### Before committing, always run:

```bash
bun run lint          # Auto-fix lint issues
cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json  # Type check
```

---

## 3. TypeScript Rules

### Strict mode is ON

Both `apps/backend/tsconfig.json` and `apps/frontend/tsconfig.json` use `"strict": true`. All code must compile without errors under strict mode.

### `any` usage rules

| Context | Allowed | Notes |
|---------|---------|-------|
| Controller method return type `Promise<any>` | **YES — DO NOT CHANGE** | Elysia route inference depends on this. Changing to typed returns BREAKS the framework. |
| `AuthContext<any>` generic | **YES — DO NOT CHANGE** | Changing to `AuthContext<unknown>` breaks body/query/params type inference. |
| `catch (e: any)` in controllers | **YES** | Standard pattern for error handling in Elysia route handlers. |
| `catch (e: unknown)` in services/frontend | **Preferred** | Then cast: `(e as Error).message` |
| New function parameters/returns | **NO** | Use `unknown`, generics, or proper types. |
| `role: roleVal as any` in DB inserts | **YES** | Drizzle enum casting — unavoidable with string CSV input. |

### Catch block pattern

```typescript
// Backend controllers — acceptable
try {
  // ...
} catch (e: any) {
  set.status = 400;
  return { error: e.message || 'Failed' };
}

// Services and frontend — preferred
try {
  // ...
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : 'Unknown error';
  throw new Error(msg);
}
```

### Return types

- Services: add explicit return types on exported methods when practical
- Controllers: `Promise<any>` is the standard — do not change
- Private/internal methods: implicit return types are OK

---

## 4. Biome / Lint Rules

### Configuration (biome.json)

- **Indent**: 2 spaces
- **Line width**: 120 characters
- **Quotes**: single quotes
- **Trailing commas**: always
- **Semicolons**: always
- **`noExplicitAny`**: warn only (not error)
- **`useTemplate`**: warn — prefer template literals over string concatenation
- **`noNonNullAssertion`**: off (project uses `!` extensively)

### Before every commit

```bash
bun run lint    # Runs: biome check --write .
```

This auto-fixes formatting issues. Fix any remaining errors manually.

### File scope

Biome only checks:
- `apps/backend/src/**/*.ts`
- `apps/frontend/src/**/*.{ts,tsx}`

Files outside these paths (scripts, configs, tests) are not linted by CI.

---

## 5. Backend Rules

### Controller pattern

```typescript
export class ExampleController {
  static async method({ body, params, query, set, getCurrentUser }: AuthContext<BodyType>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

      // Business logic via service
      const result = await ExampleService.doSomething(body);
      return result;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }
}
```

**Rules:**
- Always static methods, no instances
- Always destructure from `AuthContext<TBody>`
- Always check `getCurrentUser()` first
- Always wrap in try/catch with `set.status` + `return { error }`
- Return type is `Promise<any>` — DO NOT change

### Service pattern

```typescript
export class ExampleService {
  static async getAll(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const data = await db.query.table.findMany({ limit, offset });
    const [{ total }] = await db.select({ total: count() }).from(table);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
```

**Rules:**
- Always static methods
- Throw `new Error()` for business errors — do not catch, let controllers handle
- Use Drizzle ORM for all DB access
- Always use `where` clauses — NEVER fetch unbounded tables
- Return `{ data, meta }` for paginated lists

### Database query safety

```typescript
// BAD — fetches entire table
const all = await db.query.cpmkCpl.findMany();

// GOOD — filtered by relevant IDs
const all = await db.query.cpmkCpl.findMany({
  where: inArray(cpmkCpl.cpmkId, Array.from(relevantIds)),
});
```

**Rules:**
- Every `findMany()` MUST have a `where` clause unless the table is small and bounded (< 100 rows)
- Never pass optional query params without validation — at least one filter must be provided
- Use `inArray()` for batch filtering

### CSV import pattern

```typescript
// Process rows individually, collect errors
for (let i = 1; i < rows.length; i++) {
  try {
    // validate, insert
    result.successCount++;
  } catch (err: any) {
    result.errors.push({ line: lineNum, error: err.message });
  }
}
```

**Rules:**
- NEVER wrap entire import in `db.transaction()` — one bad row should not block others
- Collect errors per row, continue processing valid rows
- Use `result.errors.push({ line, error })` pattern
- CSV parser MUST respect quoted newlines (see section below)

### CSV parser requirements

Both frontend (`apps/frontend/src/utils/csv.ts`) and backend (`apps/backend/src/services/csv-import.service.ts`) parsers MUST use character-by-character parsing that respects double-quoted fields.

```typescript
// CORRECT — respects quoted newlines
// "text with\nnewlines" stays as one row

// WRONG — splits on \n first
const lines = text.split(/\r?\n/); // BREAKS quoted newlines
```

Newlines inside quoted fields (`"Visi\nMisi"`) must NOT split into separate CSV rows.

### File uploads — use native fs

```typescript
// CORRECT
import { mkdir } from 'node:fs/promises';
await mkdir(uploadDir, { recursive: true });

// WRONG — shell overhead, less portable
await Bun.$`mkdir -p ${uploadDir}`.quiet();
```

---

## 6. Frontend Rules (SolidJS)

### Component pattern

```typescript
import { createSignal, createResource, For, Show } from 'solid-js';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function ExamplePage() {
  const auth = useAuth();
  const toast = useToast();
  const [search, setSearch] = createSignal('');

  const [data, { refetch }] = createResource(
    () => search(),
    async (q) => fetchApi<DataType[]>(`/endpoint?search=${q}`)
  );

  return (
    <MainLayout>
      {/* page content */}
    </MainLayout>
  );
}
```

**Rules:**
- Default export, function declaration (NOT arrow function)
- Wrap in `<MainLayout>`
- Use `createSignal` for local state (NOT `useState` — this is SolidJS, not React)
- Use `createResource` for async data (NOT `useEffect` + `setState`)
- Use `useAuth()`, `useToast()`, `useWorkspace()` contexts

### SolidJS `<For>` loop — dynamic API data

When iterating over dynamic API data in `<For>`, avoid overly strict inline type annotations:

```typescript
// PREFERRED — use a named interface for the data shape
interface MahasiswaRow {
  id: number;
  nim: string;
  nama: string;
  // ... only include fields you actually use in the template
}

<For each={data()}>
  {(item: MahasiswaRow) => (
    <tr>
      <td>{item.nim}</td>
      <td>{item.nama}</td>
    </tr>
  )}
</For>

// If the API response shape changes frequently or has many optional fields,
// use SafeAny from apps/frontend/src/utils/api.ts:
import { SafeAny } from '../utils/api';

<For each={data()}>
  {(item: SafeAny) => (
    <tr>
      <td>{item.nim}</td>
    </tr>
  )}
</For>
```

**Reason:** SolidJS detects type mismatches aggressively inside `<For>` flow components. Inline types with optional/null fields from the backend often cause TS strict mode compilation failures.

### TypeScript Signal Typing & Controller Interfaces
When creating SolidJS state signals to store data fetched from backend controllers, **always use the exported types/interfaces from the controllers** rather than writing inline object types. 

**Reason:** Backend response shapes can represent specific SQL types differently (e.g., numeric fields returning as `string | null` instead of `number | undefined`). Inline types trigger type mismatch compile errors when setting the signal value.

**Correct:**
```typescript
import { cplController, CplMapping } from '../controllers/cplController';

const [mappings, setMappings] = createSignal<CplMapping[]>([]);
```

**Wrong:**
```typescript
const [mappings, setMappings] = createSignal<{ id: number; bobot?: number }[]>([]);
```

### Error handling

```typescript
// Frontend pattern
try {
  await someApiCall();
  toast.showToast('Success', 'success');
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : 'Unknown error';
  toast.showToast(msg, 'error');
}
```

### Data fetching pattern

```typescript
// Resource with reactive source
const [data, { refetch }] = createResource(
  () => ({ search: search(), page: page() }),
  async (params) => fetchApi<PaginatedResponse<Item>>(`/items?search=${params.search}&page=${params.page}`)
);

// Refetch after mutation
await createItem(newData);
refetch();
```

---

## 7. Database Rules

### Migrations

- **NEVER modify applied migration files** in `apps/backend/drizzle/`
- Create new migrations: `bun run db:generate`
- Apply safely: `bun run db:safe-migrate`
- **NEVER use `drizzle-kit push` in production** — it can cause data loss

### Schema changes

1. Update `apps/backend/src/models/schema.ts`
2. Generate migration: `bun run db:generate`
3. Verify SQL in `apps/backend/drizzle/` directory
4. Test on staging before production

### Enum values

If adding new PostgreSQL enum values, also update `apps/backend/src/scripts/ensure-enums.ts`.

### Backups

- Handled automatically by deployment scripts
- Stored in `apps/backend/backups/` (Docker volume)
- Retention: last 10 backups
- Manual backup: `bun run db:backup`

---

## 8. Docker Rules

### Healthchecks — use env vars, NOT hardcoded values

```yaml
# CORRECT
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]

# WRONG — breaks if user overrides POSTGRES_USER
healthcheck:
  test: ["CMD", "pg_isready", "-U", "simak_user", "-d", "simak_vokasi"]
```

### Environment variables

Always use `${VAR:-default}` syntax in docker-compose files:

```yaml
environment:
  POSTGRES_USER: ${POSTGRES_USER:-simak_user}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-simak_password}
```

### Entrypoint

- Backend: `apps/backend/entrypoint.sh` (runs safe-migrate, then starts server)
- Frontend: nginx with `apps/frontend/nginx.conf`

### Building

```bash
# Backend
docker build -f apps/backend/Dockerfile .

# Frontend (with build args)
docker build --build-arg VITE_API_URL=/api --build-arg VITE_APP_MODE=production -f apps/frontend/Dockerfile .
```

---

## 9. Deployment Rules

### Branch mapping

| Branch | Environment | Deploy trigger |
|--------|-------------|----------------|
| `main` | Production | Push to main → `deploy-production.yml` |
| `development` | Staging | Push to development → `deploy-staging.yml` |

### Staging vs Production separation

**CRITICAL**: Staging and production MUST have completely separate:
- Database names (`simak_vokasi` vs `simak_vokasi_staging`)
- Database users (`simak_poliwako` vs `simak_user_staging`)
- Database passwords
- JWT secrets
- Backend ports (3000 vs 3001)
- Frontend ports (8080 vs 8082)
- Domain names

### Health checks after deploy

```bash
# Production
curl http://localhost:3000/health
# Expected: {"status":"ok","checks":{"memory":"ok"}}

# Staging
curl http://localhost:3001/health
# Expected: {"status":"ok","checks":{"memory":"ok"}}
```

Status `"degraded"` with `"memory":"warning"` is acceptable on memory-constrained VPS.

### Deploy scripts

Both `deploy-staging.sh` and `deploy.sh` MUST source `.env` as fallback:

```bash
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi
```

### Emergency SSH deploy

Only use when CI/CD pipeline is broken:

```bash
# Staging
ssh -p 2200 user@vps "cd /var/www/simakjs-staging && ./deploy-staging.sh development"

# Production
ssh -p 2200 user@vps "cd /var/www/simakjs && ./deploy.sh main"
```

---

## 10. Git Rules

### Branches

- `main` — production-ready code only
- `development` — staging integration branch
- Feature branches: `feat/*`, `fix/*`, `chore/*`

### Commits

- Conventional format: `type(scope): description`
- Examples: `feat(krs): add export`, `fix(obe): filter unbounded query`
- Language: Indonesian or English — be consistent within a PR

### PR requirements

- Must pass CI (lint + typecheck + build)
- Review all changed files
- No secrets or `.env` files in commits

### Remote operations — CRITICAL

Before ANY git command that contacts the remote repository, clear the sandbox-injected token:

```bash
# CORRECT
env -u GITHUB_TOKEN git push origin development
env -u GITHUB_TOKEN git pull origin main

# WRONG — will fail with authentication error in sandbox
git push origin development
```

**Reason:** AI agents running in sandbox environments inject a dummy `GITHUB_TOKEN` that causes authentication failures with real repositories.

### Merge strategy

- PRs to `main` or `development` — squash or rebase (no merge commits)
- Keep commit history clean

---

## 11. Security Rules

### Secrets

- **NEVER** commit `.env`, `.env.local`, or any secrets file
- Use GitHub Secrets for CI/CD (`VPS_HOST`, `VPS_SSH_KEY`, `GH_PAT`, etc.)
- JWT secrets must be unique per environment

### Authentication

- Every controller method MUST check `getCurrentUser()` first
- Role-based access: check `user.role` against allowed roles
- Return 401 for unauthenticated, 403 for unauthorized

### CORS

```yaml
# Production — specific origins only
CORS_ORIGIN: "https://simak.politekniksorowako.ac.id"

# Staging — include both staging and local
CORS_ORIGIN: "https://staging-simak.politekniksorowako.ac.id,http://localhost:8082"
```

NEVER use `CORS_ORIGIN: *` in production.

### Passwords

- Hash with bcrypt, cost 12: `Bun.password.hash(pw, { algorithm: 'bcrypt', cost: 12 })`
- Never store plain text passwords
- Default passwords: random 15 chars (`crypto.randomUUID().replace(/-/g, '').slice(0, 12) + 'Aa1'`)

### Shell commands

Use native Node.js/Bun APIs instead of shell execution:

```typescript
// CORRECT
import { mkdir } from 'node:fs/promises';
await mkdir(path, { recursive: true });

// AVOID
await Bun.$`mkdir -p ${path}`.quiet();
```

---

## 12. File Organization

### Backend (`apps/backend/src/`)

```
controllers/     # Elysia route handlers (static classes)
services/        # Business logic (static classes)
models/          # Drizzle ORM schema (schema.ts)
utils/           # Shared: db.ts, types.ts, helpers
scripts/         # DB management: migrate, backup, restore, seed
__tests__/       # Test files (excluded from CI type check)
```

### Frontend (`apps/frontend/src/`)

```
routes/          # Page components (one per route)
components/      # Shared UI components
  ui/            # Generic: Button, Input, Modal, Table, etc.
controllers/     # API client functions (fetch wrappers)
contexts/        # SolidJS contexts: Auth, Toast, Workspace
utils/           # Shared: api.ts, csv.ts, export.ts
```

### Naming conventions

| Type | Convention | Example |
|------|-----------|---------|
| Controller | `<Name>Controller` | `MahasiswaController` |
| Service | `<Name>Service` | `KrsService` |
| Schema table | `camelCase` | `mahasiswa`, `kelasKuliah` |
| Component | `PascalCase` | `ProgramStudi.tsx` |
| Utility | `camelCase` | `parseCsv`, `fetchApi` |
| Type/Interface | `PascalCase` | `AuthContext`, `PaginationQuery` |

---

## Quick Reference — Common Mistakes

| Mistake | Why it breaks | Fix |
|---------|--------------|-----|
| Changing `AuthContext<any>` to `AuthContext<unknown>` | Elysia type inference fails | Keep `<any>` |
| Changing controller `Promise<any>` to typed return | Elysia route types break | Keep `Promise<any>` |
| Fetching entire table without `where` | Memory crash in production | Add `where` clause |
| Wrapping CSV import in transaction | One bad row blocks entire file | Process rows individually |
| Hardcoding DB name in Docker healthcheck | Breaks when user overrides `.env` | Use `$$POSTGRES_USER` |
| Using `Bun.$`mkdir`` for directories | Shell overhead, less portable | Use `node:fs/promises` |
| Splitting CSV by `\n` before parsing | Breaks quoted newlines | Character-by-character parse |
| Not clearing `GITHUB_TOKEN` for git push | Sandbox auth failure | `env -u GITHUB_TOKEN git ...` |
| Using `CORS_ORIGIN: *` in production | Security risk | Use specific origins |
| Deploying via SSH when CI/CD works | Bypasses quality gates | Use CI/CD first |
| Redefining controller types inline in signals | Causes TS strict compilation failures on API updates | Use exported controller interfaces (e.g., `CplMapping`) |
