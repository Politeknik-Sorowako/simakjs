# BACKLOG — Temuan Keamanan & Perbaikan

Daftar item keamanan yang teridentifikasi tapi belum diimplementasikan. Dikelompokkan berdasarkan prioritas.

---

## HIGH — Segera Dikerjakan

- [x] **Password policy inkonsisten**: Register (`schemas/auth.schema.ts`) min 6 tanpa complexity. Reset (`auth.controller.ts`) min 8 + huruf kapital + angka. Admin reset (`user.controller.ts`) min 6 tanpa complexity. Standarisasi ke satu kebijakan.
- [x] **Rate-limit in-memory per-email**: `auth.controller.ts:14-15` — hanya berbasis email, tanpa IP/UA fingerprint. Distributed attack lolos. Pertimbangkan Redis-backed rate limit atau minimal gabung IP+email sebagai key.

---

## MEDIUM — Sprint Berikutnya

- [x] **`forgot-password` token disclosure**: `auth.controller.ts:493-498` — saat `NODE_ENV=test`, API mengembalikan `{ token }` dalam response body. Berbahaya jika test env bocor ke produksi. Guard lebih ketat atau hapus path test dari controller.
- [x] **Swagger/E2E ter-expose di staging**: `app.ts:65,76` — `isDevelopment = NODE_ENV !== 'production'` membuat Swagger aktif di staging. Pertimbangkan `NODE_ENV === 'development'` saja, atau disable di staging secara eksplisit.
- [x] **Upload admisi tanpa validasi**: `controllers/admisi.controller.ts:171-214` — tidak cek `file.size`, `file.type`, atau magic bytes. Path traversal mitigasi parsial tapi header-injection via `originalName` (`Content-Disposition: filename="${doc.originalName}"`) masih mungkin.

---

## LOW — Backlog / Best Practice

- [x] **Race condition sliding refresh** *(wont-fix — accepted risk)*: Dua request simultan bisa memicu refresh independen — token pertama valid beberapa detik lebih pendek dari ideal. Overkill untuk mitigasi (perlu mutex per-user).
- [x] **Frontend idle timer drift** *(wont-fix — accepted risk)*: Timer frontend dijadwalkan berdasarkan `exp` token saat login/refresh. Jika backend sliding refresh mengirim token baru sebelum timer frontend update, gap beberapa detik mungkin terjadi. Dalam praktik negligible.
- [x] **WebSocket token via query param**: `app.ts:295` — token dikirim via `?token=` yang bisa bocor ke access log/proxy. Pindah ke `Sec-WebSocket-Protocol` header.
- [x] **Token storage di localStorage**: Frontend simpan JWT di `localStorage` — rentan XSS curi token. httpOnly cookie sudah tersedia sebagai alternatif (backend sudah set). Evaluasi migrasi penuh ke cookie-only.
- [x] **Admin role whitelist**: Register tidak memblokir role `kaprodi`, `prodi`, `plp`, `instruktur` secara eksplisit — hanya `admin`, `prodi`, `keuangan` yang diblokir. Pastikan tidak ada role sensitif yang bisa didaftarkan mandiri.
- [x] **Kontrak 401 vs 403 tidak konsisten**: Banyak controller memetakan `!user` (tidak login/kedaluwarsa/kill-switch) ke `403`, padahal secara semantik harus `401`; `403` seharusnya hanya untuk role mismatch. Frontend `fetchApi` hanya auto-logout+redirect pada `401`. Mitigasi saat ini: poller notifikasi (401) + redirect langsung setelah bump menutup gap, tapi refactor kontrak endpoint perlu dijadwalkan.

---

## Ditutup tanpa aksi (accepted risk)

- [x] **Race sliding refresh**: JWT stateless — tidak ada rotasi/invalidasi token lama server-side; dua token hasil refresh independen dan keduanya valid penuh sampai `exp` masing-masing. Tidak ada shared mutable state yang diperebutkan, sehingga mutex per-user tidak relevan. Tidak ada degradasi masa berlaku.
- [x] **Idle timer drift**: Pasca-PR #416, `sessionExp` frontend disinkronkan via event `simak:token-refresh` tiap respons membawa `X-Refresh-Token`, lalu timer dijadwalkan ulang. Sisa skenario (slide tepat antara respons terakhir & fire timer) berakibat fail-closed ke logout beberapa detik lebih awal — aman, tanpa kebocoran sesi.

## Selesai (PR #416 — feat/cookie-only-auth)

- [x] Migrasi cookie-only frontend — hapus injeksi header `Authorization` & baca/tulis JWT di `localStorage` (10 titik).
- [x] `AuthContext` bootstrap dari `GET /auth/me` — identitas + `exp` sesi; idle timer pakai `exp` dari `/me` bukan decode JWT.
- [x] Sliding refresh tetap jalan — `X-Refresh-Token` → cookie; event hanya membawa `exp` untuk reschedule timer.
- [x] Konsumen langsung (`ThemeToggle`, `Profil`, `StudentAvatar`, `mahasiswaController`, `auditController`, `presensiController`) bersih dari localStorage token.

## Selesai (PR #415 — feat/auth-me-endpoint)

- [x] Endpoint `GET /auth/me` — resolve sesi dari cookie httpOnly, kembalikan identitas + `exp`; 401 bila tanpa sesi.

## Selesai (PR #414 — fix/low-security-contracts)

- [x] WebSocket bimbingan dihapus — dead code tanpa konsumen; menutup permukaan serangan token di query param.
- [x] Kontrak 401/403 distandarisasi — pecah guard `!user || <role>` jadi `!user → 401` dan role-mismatch → `403` di 54 controller (209 guard).
- [x] Spike cookie-only selesai — hasil **NO-GO** (butuh endpoint `/auth/me` + sumber `exp` untuk idle timer); migrasi ditunda sebagai PR terpisah.

## Selesai (PR #413 — fix/medium-security-hardening)

- [x] `forgot-password` token disclosure dihapus — cabang `NODE_ENV=test` yang mengembalikan `{ token }` dibuang; token kini via `AuthService.createPasswordResetForEmail()`.
- [x] Swagger/E2E dikunci dari staging — `isDevelopment = NODE_ENV === 'development'`; guard e2e hanya `development|test`.
- [x] Upload admisi divalidasi — batas 5 MB, allowlist ekstensi, magic bytes (PDF/JPEG/PNG/WebP) via `utils/file-validation.ts`.
- [x] Header-injection `Content-Disposition` dicegah — sanitasi `originalName` di download admisi.

## Selesai (PR #412 — fix/password-policy-and-rate-limit)

- [x] Password policy tersentralisasi — `validatePassword()` (min 8 + kapital + angka) di register, reset, admin reset, profile update, admisi.
- [x] Rate-limit komposit IP+email — key `login:<ip>:<email>` & `forgot:<ip>:<email>`, sweep interval, scan keys di clearRateLimit.
- [x] Role allowlist register — hanya `dosen|mahasiswa|guest` (defense-in-depth).
- [x] Typed error `PasswordValidationError` — registrasi catch block pakai `instanceof` bukan string matching.
- [x] `updateProfile` bypass diperbaiki — sekarang pakai `validatePassword()`.
- [x] `clearRateLimit` collect-before-delete — hindari mutasi Map saat iterasi.

## Selesai (PR #408 — feat/session-duration-idle)

- [x] JWT tanpa expiry — sekarang memuat `iat`/`exp` sesuai `SESSION_DURATION_MINUTES`.
- [x] Cookie `maxAge` hardcoded 7 hari — sekarang disinkronkan dengan durasi sesi.
- [x] Logout stateless — sekarang menghapus cookie `access_token` server-side.
- [x] 2FA interim token abadi — sekarang kedaluwarsa 10 menit.
- [x] Parameter `SESSION_DURATION_MINUTES` dengan validasi range (15–10080).
- [x] Sliding idle timeout via `X-Refresh-Token` + cookie.
- [x] Frontend idle timer + warning 5 menit + auto-logout.
