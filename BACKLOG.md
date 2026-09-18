# BACKLOG — Temuan Keamanan & Perbaikan

Daftar item keamanan yang teridentifikasi tapi belum diimplementasikan. Dikelompokkan berdasarkan prioritas.

---

## HIGH — Segera Dikerjakan

- [ ] **Password policy inkonsisten**: Register (`schemas/auth.schema.ts`) min 6 tanpa complexity. Reset (`auth.controller.ts`) min 8 + huruf kapital + angka. Admin reset (`user.controller.ts`) min 6 tanpa complexity. Standarisasi ke satu kebijakan.
- [ ] **Rate-limit in-memory per-email**: `auth.controller.ts:14-15` — hanya berbasis email, tanpa IP/UA fingerprint. Distributed attack lolos. Pertimbangkan Redis-backed rate limit atau minimal gabung IP+email sebagai key.

---

## MEDIUM — Sprint Berikutnya

- [ ] **`forgot-password` token disclosure**: `auth.controller.ts:493-498` — saat `NODE_ENV=test`, API mengembalikan `{ token }` dalam response body. Berbahaya jika test env bocor ke produksi. Guard lebih ketat atau hapus path test dari controller.
- [ ] **Swagger/E2E ter-expose di staging**: `app.ts:65,76` — `isDevelopment = NODE_ENV !== 'production'` membuat Swagger aktif di staging. Pertimbangkan `NODE_ENV === 'development'` saja, atau disable di staging secara eksplisit.
- [ ] **Upload admisi tanpa validasi**: `controllers/admisi.controller.ts:171-214` — tidak cek `file.size`, `file.type`, atau magic bytes. Path traversal mitigasi parsial tapi header-injection via `originalName` (`Content-Disposition: filename="${doc.originalName}"`) masih mungkin.

---

## LOW — Backlog / Best Practice

- [ ] **Race condition sliding refresh**: Dua request simultan bisa memicu refresh independen — token pertama valid beberapa detik lebih pendek dari ideal. Overkill untuk mitigasi (perlu mutex per-user).
- [ ] **Frontend idle timer drift**: Timer frontend dijadwalkan berdasarkan `exp` token saat login/refresh. Jika backend sliding refresh mengirim token baru sebelum timer frontend update, gap beberapa detik mungkin terjadi. Dalam praktik negligible.
- [ ] **WebSocket token via query param**: `app.ts:295` — token dikirim via `?token=` yang bisa bocor ke access log/proxy. Pindah ke `Sec-WebSocket-Protocol` header.
- [ ] **Token storage di localStorage**: Frontend simpan JWT di `localStorage` — rentan XSS curi token. httpOnly cookie sudah tersedia sebagai alternatif (backend sudah set). Evaluasi migrasi penuh ke cookie-only.
- [ ] **Admin role whitelist**: Register tidak memblokir role `kaprodi`, `prodi`, `plp`, `instruktur` secara eksplisit — hanya `admin`, `prodi`, `keuangan` yang diblokir. Pastikan tidak ada role sensitif yang bisa didaftarkan mandiri.
- [ ] **Kontrak 401 vs 403 tidak konsisten**: Banyak controller memetakan `!user` (tidak login/kedaluwarsa/kill-switch) ke `403`, padahal secara semantik harus `401`; `403` seharusnya hanya untuk role mismatch. Frontend `fetchApi` hanya auto-logout+redirect pada `401`. Mitigasi saat ini: poller notifikasi (401) + redirect langsung setelah bump menutup gap, tapi refactor kontrak endpoint perlu dijadwalkan.

---

## Selesai (PR #408 — feat/session-duration-idle)

- [x] JWT tanpa expiry — sekarang memuat `iat`/`exp` sesuai `SESSION_DURATION_MINUTES`.
- [x] Cookie `maxAge` hardcoded 7 hari — sekarang disinkronkan dengan durasi sesi.
- [x] Logout stateless — sekarang menghapus cookie `access_token` server-side.
- [x] 2FA interim token abadi — sekarang kedaluwarsa 10 menit.
- [x] Parameter `SESSION_DURATION_MINUTES` dengan validasi range (15–10080).
- [x] Sliding idle timeout via `X-Refresh-Token` + cookie.
- [x] Frontend idle timer + warning 5 menit + auto-logout.
