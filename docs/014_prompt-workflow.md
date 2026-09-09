Role: You are acting as the System Architect & Planner under @AGENTS.MD.

Context: Refer to @CODEBASE_CONTEXT.MD and existing codebase structure.

Task: Create a detailed step-by-step implementation plan for the following task:

- pada halaman /apel/monitor dan /presensi-apel, tampilkan dosen PJ yang lebih dari 1 orang dalam format pemisah koma.

Requirements:

Analyze dependencies, target files to modify/create, and unit tests needed.

Break down the implementation into small, executable steps.

Save/overwrite the final output directly into a file named implementation_plan.md in the project root.

Do NOT write full source code implementations yet—focus strictly on structural planning.

---

# 1. Buat branch baru dari branch utama

git checkout main
git pull
git checkout -b feature/nama-fitur-baru

# 2. Eksekusi OpenCode CLI dengan model Low-Cost (DeepSeek V4 Flash)

opencode run --model opencode/deepseek-v4-flash \
 "BACA DAN BUKA FILE implementation_plan.md SERTA @CODEBASE_CONTEXT.MD. Implementasikan seluruh rencana kode yang tertulis di implementation_plan.md secara akurat. Jangan mengubah bagian kode yang tidak relevan. buatkan pr baru ke arah development untuk commit perubahan code"

# 3. Jalankan Linter / Testing lokal (opsional tapi disarankan)

npm test # atau `bun test` / `biome check`

# 4. Commit dan Push Branch Baru

git add .
git commit -m "feat: implementasi sesuai implementation_plan.md"
git push -u origin feature/nama-fitur-baru

# 5. Buat Pull Request baru (menggunakan GitHub CLI)

gh pr create --title "feat: implementasi [Nama Fitur]" --body "PR otomatis dibuat oleh OpenCode CLI berdasarkan `implementation_plan.md`."

===

Role: You are acting as the Senior Code Reviewer & QA Lead under @AGENTS.MD.

Task: Perform a thorough code review on the changes made in PR 329

Steps:

Compare the implementation against implementation_plan.md to ensure all plan criteria are met.

Inspect modified files for potential syntax errors, edge-case bugs, security vulnerabilities, or performance bottlenecks.

Run the automated test suite in terminal (npm test / bun test).

If any bugs or failing tests are found:

Generate a list of critical fixes needed.

Execute opencode run --model opencode/deepseek-v4-flash "Fix errors: [JELASKAN ERROR]" to automatically fix them.

If everything passes, write a summary review and approve the PR for merging.
