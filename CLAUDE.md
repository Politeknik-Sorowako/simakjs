# SIMAK Vokasi — Claude Instructions

> This file provides project-specific instructions for Claude (opencode).
> For comprehensive coding standards, see [AGENTS.md](./AGENTS.md).

---

## Read First

1. **AGENTS.md** — All coding rules, CI/CD requirements, and common mistakes to avoid
2. **README.md** — Project overview, setup instructions, architecture docs

## Critical Reminders

- **DO NOT change** `AuthContext<any>` or `Promise<any>` return types — breaks Elysia
- **DO NOT fetch** entire DB tables without `where` clauses
- **DO NOT use** `Bun.$\`mkdir\`` — use `node:fs/promises` instead
- **DO NOT commit** `.env` files or secrets
- **ALWAYS** clear `GITHUB_TOKEN` before `git push`/`git pull`: `env -u GITHUB_TOKEN git ...`
- **ALWAYS** run `bun run lint` before committing
- **ALWAYS** run `cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json` before committing
- **DO NOT redefine** controller response types inline in SolidJS signals — use exported interfaces instead (e.g., `CplMapping`)

## CI/CD Pipeline

CI runs 4 checks on every push/PR:
1. `bunx biome ci .` — lint
2. `bunx tsc --noEmit -p tsconfig.ci.json` — backend type check
3. `cd apps/frontend && bun run build` — frontend build
4. Docker build — both images

Deployment goes through GitHub Actions first. SSH is emergency fallback only.

## Skills

- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`

## Testing

- Do NOT run full test suites automatically
- Run targeted tests only for the specific module being modified
- Test command: `cd apps/backend && bun run test`
