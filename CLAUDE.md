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
- **ALWAYS structure** implementation plans (`implementation_plan.md`) step-by-step with explicit file paths, before/after code snippets, and exact CLI commands so they are easy to execute by junior developers or smaller models.
- **ALWAYS verify** backend-frontend cross-consistency between Elysia schemas (`apps/backend/src/schemas/`) and frontend request payloads (`apps/frontend/src/`) in implementation plans to prevent HTTP 422 (Unprocessable Entity) validation errors.
- **Berikan respon langsung** pada inti masalah tanpa salam atau basa-basi.
- **Jangan pernah mencetak ulang seluruh isi file** jika hanya mengubah beberapa baris. Tunjukkan HANYA bagian kode yang diubah (diff / patched code).
- **Buat penjelasan maksimal 2-3 kalimat** setelah kode.
- **Gunakan tool pemindaian berkas secara spesifik**, jangan membaca direktori secara menyeluruh jika tidak diminta.
- **Buat PR baru** ke arah branch `development` apabila ada kode yang diimplementasi pertama kali di setiap percakapan baru dengan agen AI.
- **Wajib mengeksekusi `bun run lint`** dan memastikan kepatuhan Biome lint (`bunx biome ci .`) sebelum setiap commit/push agar CI/CD tidak gagal.

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
- **Uji `bun test` pada Review / CR HANYA pada modul terkait**: Dilarang menjalankan blanket `bun test` di root saat code review. Jalankan `bun test` hanya untuk file test modul yang mengalami perubahan (misal: `bun test apps/backend/src/__tests__/<modul>.test.ts`).
- Jika PR hanya mencakup frontend, tidak perlu menjalankan integration test backend; cukup `bun run lint` dan build frontend.
- Test command: `cd apps/backend && bun run test` (hanya bila DB test container aktif dan diperlukan pengujian penuh).
