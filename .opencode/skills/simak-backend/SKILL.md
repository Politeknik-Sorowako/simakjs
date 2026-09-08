---
name: simak-backend
description: Standar pengembangan backend SIMAK Vokasi. Mengatur arsitektur Elysia, Drizzle ORM, runtime Bun, strict type system (tanpa any), skema validasi, serta keamanan controller dan service.
---

# SIMAK Backend Skill — OpenCode

Skill ini adalah panduan baku dan guardrail ketat untuk agen OpenCode saat mengimplementasikan atau merefaktor kode backend (`apps/backend`) di SIMAK Vokasi.

---

## 1. Rules & Hard Guardrails

Setiap baris kode backend yang dihasilkan WAJIB mematuhi aturan berikut tanpa kecuali:

1. **Strict TypeScript & Zero `any`**:
   - `noExplicitAny` berstatus `"error"` di `biome.json`. DILARANG menggunakan tipe `any`.
   - Gunakan `unknown`, `SafeAny` (`Record<string, unknown>`), atau interface/type spesifik.
   - **HANYA DUA Pengecualian Resmi**:
     1. Return type controller Elysia: `Promise<any>`
     2. Generic parameter konteks: `AuthContext<any, any>`
     Setiap pengecualian WAJIB diawali komentar:
     `// biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement`
2. **Error Handling Terstandar**:
   - Blok catch WAJIB menggunakan `catch (e: unknown)`.
   - Ekstrak pesan error menggunakan tipe aman: `e instanceof Error ? e.message : 'Unknown error'`.
   - DILARANG menggunakan `catch (e: any)`.
3. **Arsitektur Controller**:
   - Semua method controller bertipe `static async`.
   - Destruktur `AuthContext`: `{ params, body, query, set, getCurrentUser }`.
   - Wajib cek otentikasi & otorisasi RBAC terlebih dahulu menggunakan `await getCurrentUser()` dan `hasRole(user, [...])`.
   - Tangkap seluruh error dengan try/catch dan kembalikan response seragam `{ error: string }` dengan HTTP status code yang sesuai (400, 401, 403, 404, 500).
4. **Arsitektur Service & Drizzle ORM**:
   - Semua service bertipe `static async`.
   - Query Drizzle WAJIB menyertakan klausul `where` eksplisit atau pagination (`limit`/`offset`). DILARANG melakukan `db.select().from(table)` tanpa batas (unbounded select).
   - Service WAJIB melempar standard `Error` (`throw new Error('Pesan error')`), BUKAN mengembalikan object error atau string.
5. **Elysia Schema & Date Handling**:
   - Gunakan `t.*` dari Elysia untuk seluruh validasi schema (body, query, params, response). DILARANG menambah validator eksternal seperti Zod atau Joi.
   - Kolom kalender tanggal (`mode: 'string'`, e.g. `tanggal`, `tanggalLahir`, `tanggalBimbingan`): gunakan `t.String()` atau `t.Union([t.String(), t.Null()])`. Nilai wire format adalah plain `'YYYY-MM-DD'`.
   - Kolom timestamp (`createdAt`, `updatedAt`): gunakan `t.Date()`, BUKAN `t.String()` (Elysia menolak valid `Date` dengan status 422 bila salah konfigurasi).
6. **Native Bun First**:
   - Gunakan `Bun.password.hash()` dan `Bun.password.verify()` (algoritma bcrypt). DILARANG mengimpor package `bcrypt` atau `bcryptjs`.
   - Gunakan native Node/Bun APIs (`node:fs/promises`, `node:path`) untuk file operations, bukan command shell exec.
7. **Batch & Data Operations**:
   - Pemrosesan bulk CSV/data wajib diproses baris-per-baris (row-by-row) dengan individual error handling.
   - DILARANG membungkus seluruh import bulk ke dalam satu transaksi database tunggal (all-or-nothing).
   - Gunakan character-by-character CSV parser untuk menjaga kestabilan quoted newlines.

---

## 2. Code Patterns: Bad vs Good Examples

### A. Controller Pattern & Error Handling

#### ❌ BAD (Melanggar tipe any, tanpa auth check, error handling longgar)
```typescript
// BAD: any type tanpa ignore comment, tidak ada cek user/role, format error tidak konsisten
export class MahasiswaController {
  static async getDetail(ctx: any) {
    try {
      const data = await MahasiswaService.findById(ctx.params.id);
      return data;
    } catch (e: any) {
      return { msg: e.message };
    }
  }
}
```

#### ✅ GOOD (Strict typing, auth check, Elysia ignore comment yang sah)
```typescript
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';
import { MahasiswaService } from '../services/mahasiswa.service';

export class MahasiswaController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getDetail(ctx: AuthContext<any, any>): Promise<any> {
    const { params, set, getCurrentUser } = ctx;
    try {
      const user = await getCurrentUser();
      if (!user || hasRole(user, ['guest'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }

      const id = parseInt(params.id);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID Mahasiswa tidak valid.' };
      }

      const data = await MahasiswaService.findById(id);
      if (!data) {
        set.status = 404;
        return { error: 'Data mahasiswa tidak ditemukan.' };
      }

      return data;
    } catch (e: unknown) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : 'Terjadi kesalahan internal server.' };
    }
  }
}
```

---

### B. Drizzle ORM Service Pattern

#### ❌ BAD (Unbounded query, melempar custom string, tanpa throw)
```typescript
// BAD: Mengambil seluruh tabel tanpa limit/where, mengembalikan format error kustom
export class TagihanService {
  static async getByMhs(mhsId: number) {
    const records = await db.select().from(tagihan); // Memory leak pada data besar!
    return records.filter((r) => r.mahasiswaId === mhsId);
  }
}
```

#### ✅ GOOD (Bounded where clause, throw Error standar)
```typescript
import { eq, desc } from 'drizzle-orm';
import { db } from '../utils/db';
import { tagihan } from '../models/schema';

export class TagihanService {
  static async getByMhs(mhsId: number, limit = 50, offset = 0) {
    if (mhsId <= 0) {
      throw new Error('ID mahasiswa tidak valid');
    }

    const records = await db
      .select()
      .from(tagihan)
      .where(eq(tagihan.mahasiswaId, mhsId))
      .orderBy(desc(tagihan.createdAt))
      .limit(limit)
      .offset(offset);

    return records;
  }
}
```

---

### C. Elysia Schema & Date Column Definition

#### ❌ BAD (Zod validation, tipe date/timestamp terbalik)
```typescript
// BAD: Menggunakan Zod di Elysia, format schema wire salah
import { z } from 'zod'; // DILARANG!

export const updateBimbinganSchema = z.object({
  tanggalBimbingan: z.date(), // Mengakibatkan konversi timezone off-by-one!
});
```

#### ✅ GOOD (Elysia `t.*`, date wire string, timestamp t.Date())
```typescript
import { t } from 'elysia';

export const bimbinganUpdateBody = t.Object({
  ringkasan: t.Optional(t.String({ maxLength: 2000 })),
  isApproved: t.Optional(t.Boolean({ default: true })),
  // date() column: plain string 'YYYY-MM-DD'
  tanggalBimbingan: t.Optional(t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
  // timestamp() column: t.Date()
  jadwalSesi: t.Optional(t.Date()),
  kategoriId: t.Optional(t.Union([t.Integer(), t.Null()])),
});
```

---

### D. Password Hashing & Native Bun APIs

#### ❌ BAD (Mengimpor bcrypt eksternal)
```typescript
// BAD: Menggunakan dependensi eksternal npm yang tidak perlu
import bcrypt from 'bcrypt';

const hash = await bcrypt.hash(password, 12);
```

#### ✅ GOOD (Native Bun.password)
```typescript
// GOOD: Cepat, hemat resource, bawaan Bun runtime
const hashedPassword = await Bun.password.hash(password, {
  algorithm: 'bcrypt',
  cost: 12,
});

const isValid = await Bun.password.verify(plainPassword, hashedPassword);
```

---

## 3. Verification Steps

Sebelum mengakhiri task atau mengajukan perubahan pada backend, OpenCode WAJIB menjalankan perintah berikut dan memastikan status EXIT CODE 0 (tanpa error):

```bash
# 1. Linting & formatting check seluruh repo
bun run lint

# 2. Strict type check khusus backend dengan tsconfig CI
cd apps/backend && bunx tsc --noEmit -p tsconfig.ci.json

# 3. Jalankan unit test backend (jika ada tes terkait)
bun test apps/backend
```
