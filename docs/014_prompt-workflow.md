Context: Refer to @AGENTS.md for role boundaries and @CODEBASE_CONTEXT.md for project architecture.

Task:

- pada halaman jurnal-presensi, perintah edit sesi BAP Praktikum seharusnya mengedit 1 sesi saja yang diedit saja, alih-alih mengubah/menambahkan set sesi yang sudah ada.
- untuk printah sync sebaiknya cukup satu tombol saja untuk menrekap dan mensinkronisasi presensi mahasiswa dan total menit ketidakhadirannya yang terimplikasi pada kompensasi

Execution Steps:

Plan: Act as Planner (DeepSeek V4 Pro). Create a short, step-by-step modification plan in docs/ or directly in chat. Do not write full code yet.

Build: Switch execution to Builder (DeepSeek V4 Flash). Generate or update code only for the target files specified in the plan.

Verify: Run linting/tests using bun test or biome check. If errors occur, pass only the error trace back to OpenCode to fix (max 3 auto-retries).
