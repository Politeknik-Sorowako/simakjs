Role: You are acting as the System Architect & Planner under @AGENTS.MD.

Context: Refer to @CODEBASE_CONTEXT.MD and existing codebase structure.

Task: Create a detailed step-by-step implementation plan for the following task:

- auto refresh pada halaman /apel/monitor sebaiknya hanya pada blok tabel dan rekap/summary saja, alih-alih seluruh halaman.

- halaman selalu refresh saat mengetikkan nim/nama pada searchable selector pada kolom tambah manusia di panel Kelola Anggota Kelompok Apel pada halaman /presensi-apel

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
 "BACA DAN BUKA FILE implementation_plan.md SERTA @CODEBASE_CONTEXT.MD. Implementasikan seluruh rencana kode yang tertulis di implementation_plan.md secara akurat. Jangan mengubah bagian kode yang tidak relevan. buatkan pr baru ke arah development untuk commit perubahan code."

Implementasikan seluruh rencana kode secara akurat. Jangan mengubah bagian kode yang tidak relevan. buatkan pr baru ke arah development untuk commit perubahan code.

# 3. Jalankan Linter / Testing lokal (opsional tapi disarankan)

npm test # atau `bun test` / `biome check`

# 4. Commit dan Push Branch Baru

git add .
git commit -m "feat: implementasi sesuai implementation_plan.md"
git push -u origin feature/nama-fitur-baru

# 5. Buat Pull Request baru (menggunakan GitHub CLI)

/
merge pr 381 kemudian plankan saran perbaikan terhadap temuan bun tes yg gagal
gh pr create --title "feat: implementasi [Nama Fitur]" --body "PR otomatis dibuat oleh OpenCode CLI berdasarkan `implementation_plan.md`."

===

Role: You are acting as the Senior Code Reviewer & QA Lead under @AGENTS.MD.

Task: Perform a thorough code review on the changes made in PR 399

Steps:

Compare the implementation against implementation_plan.md to ensure all plan criteria are met.

Inspect modified files for potential syntax errors, edge-case bugs, security vulnerabilities, or performance bottlenecks.

Run the automated test suite in terminal (npm test / bun test).

If any bugs or failing tests are found:

Generate a list of critical fixes needed.

Execute opencode run --model opencode/deepseek-v4.1-flash "Fix errors: [JELASKAN ERROR]" to automatically fix them.

If everything passes, write a summary review and approve the PR for merging.

=====

Role: You are acting as the Senior Code Reviewer & QA Lead under @AGENTS.MD.

Task: Perform a thorough code review on the changes made in PR 445

Steps:

Inspect modified files for potential syntax errors, edge-case bugs, security vulnerabilities, or performance bottlenecks.

Run the automated test suite in terminal (npm test / bun test).

If any bugs or failing tests are found:

Generate a list of critical fixes needed.

Execute opencode run --model opencode/deepseek-v4.1-flash "Fix errors: [JELASKAN ERROR]" to automatically fix them.

If everything passes, write a summary review and approve the PR for merging.

## Non-Critical Observations

1. **`bulkTargetMax` default is 10** (Khs.tsx:45): When user opens the rekap modal, it defaults to "0-10" target scale. This is intentional — shows conversion proposals. User can switch to "0-100" via dropdown.

2. **Redundant client-side sort** in Krs.tsx (`sortedKrsData`): Server already sorts, but client re-sorts the same page. Harmless but could be removed in a follow-up for clarity.

3. **No overlap validation in `bulkSaveKonversi`**: Admin could save rules with overlapping ranges. The rekap table shows the ranges visually, and `saveKonversi` (single-rule save) already validates overlap. A follow-up could add this to bulk too.

4. **Export filters**: Some pages still use raw `search()` in export instead of `debouncedSearch()` — only MonitoringBimbingan was fixed in this PR. Noted in the plan's follow-up section.

/design-system
halaman /khs
tambahkan filter program studi
transkrip belum memunculkan nilai

1. sediakan pengaturan dalam /konfigurasi/parameter untuk mengaktifkan modul register pengguna. alih-alih tombol register pada halaman login hanya muncul saat parameter ini aktif
2. untuk KHS, untuk kasus cuti di pertengahan semester, sehingga ada dua nilai untuk mata kuliah yang sama, maka ambil nilai yang terakhir atau sediakan opsi untuk memilih nilai mana yang akan dimasukkan ke KHS/transkrip
3. sesuai BPA, munculkan Nilai Sikap (NS) pada KHS dalam bentuk Narasi sesuai ketentuan BPA
4. cegah perubahan apabila nilai sudah terkunci. meskipun dapat dibuka kembali oleh admin/prodi
