# Implementation Plan: Penyesuaian Skema Kurikulum & Relasi Angkatan

## Latar Belakang

Struktur database saat ini memiliki beberapa kekurangan dalam menangani peralihan kurikulum antar angkatan dalam satu program studi, serta relasi antara mahasiswa dan kurikulum yang berlaku untuknya.

### Masalah yang Ditemukan

1. **Tidak ada relasi eksplisit antara mahasiswa dan kurikulum**
   - Tabel `mahasiswa` hanya memiliki field `angkatan` (varchar 4 digit) dan `programStudiId`
   - Tidak ada mekanisme untuk menentukan kurikulum mana yang berlaku untuk setiap angkatan
   - Sistem tidak bisa track peralihan kurikulum (misal: angkatan 2022 pakai Kurikulum A, angkatan 2023 pakai Kurikulum B)

2. **Tabel `kurikulum_mata_kuliah` belum lengkap**
   - Tidak ada field `kelompok_mata_kuliah` untuk membedakan mata kuliah wajib umum, wajib prodi, pilihan, dll
   - Tidak ada field urutan/posisi dalam struktur kurikulum

3. **Tidak ada tabel mapping angkatan-kurikulum**
   - Saat ini hanya ada field `isAktif` di tabel `kurikulum` yang menandakan kurikulum aktif
   - Tidak bisa menangani kasus satu prodi memiliki kurikulum berbeda per angkatan

---

## Referensi Struktur Neo Feeder PDDIKTI

Berdasarkan dokumentasi Neo Feeder PDDIKTI, struktur data kurikulum terdiri dari:

### Tabel `kurikulum`
| Field | Tipe | Keterangan |
|-------|------|------------|
| id_kurikulum | varchar | Primary key (UUID dari feeder) |
| id_prodi | varchar | FK ke tabel prodi |
| nama_kurikulum | varchar | Nama kurikulum |
| kode_kurikulum | varchar | Kode kurikulum |
| nomor_sk | varchar | Nomor SK pemberlakuan |
| tanggal_sk | date | Tanggal SK |
| tahun_berlaku | varchar(4) | Tahun angkatan mulai berlaku |
| jumlah_sks_lulus | integer | Total SKS minimal lulus |
| jumlah_sks_wajib | integer | Total SKS mata kuliah wajib |
| status | integer | 0 = non-aktif, 1 = aktif |

### Tabel `kurikulum_mata_kuliah` (Kurikulum MBKM)
| Field | Tipe | Keterangan |
|-------|------|------------|
| id_kurikulum | varchar | FK ke tabel kurikulum |
| id_matkul | varchar | FK ke tabel mata_kuliah |
| semester | integer | Semester keberapa MK diambil |
| sks_mata_kuliah | integer | SKS total mata kuliah |
| sks_tatap_muka | integer | SKS tatap muka |
| sks_praktik | integer | SKS praktik |
| sks_praktik_lapangan | integer | SKS praktik lapangan |
| sks_simulasi | integer | SKS simulasi |
| is_wajib | boolean | true = wajib, false = pilihan |
| kelompok_mata_kuliah | varchar | Kelompok: wajib_umum, wajib_prodi, pilihan, tugas_akhir, dll |

### Relasi Mahasiswa ke Kurikulum
Di Neo Feeder, mahasiswa direlasikan ke kurikulum melalui:
- **id_kurikulum** di tabel mahasiswa (langsung)
- Atau melalui kombinasi **angkatan + id_prodi** yang di-map ke kurikulum tertentu

---

## Rencana Implementasi

### Tahap 1: Penambahan Tabel `angkatan_kurikulum`

#### 1.1 Definisi Tabel Baru

File: `apps/backend/src/models/schema.ts`

```typescript
export const angkatanKurikulum = pgTable('angkatan_kurikulum', {
  id: serial('id').primaryKey(),
  angkatan: varchar('angkatan', { length: 4 }).notNull(), // "2024"
  programStudiId: integer('program_studi_id')
    .notNull()
    .references(() => programStudi.id, { onDelete: 'restrict' }),
  kurikulumId: integer('kurikulum_id')
    .notNull()
    .references(() => kurikulum.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (t) => ({
  unq: unique('angkatan_kurikulum_unique').on(t.angkatan, t.programStudiId),
}));
```

**Rasional:**
- Menggunakan pendekatan mapping (angkatan, prodi) -> kurikulum
- Lebih fleksibel daripada menambah kolom `kurikulumId` langsung di tabel `mahasiswa`
- Memungkinkan satu prodi memiliki kurikulum berbeda per angkatan
- Unique constraint mencegah duplikasi mapping

#### 1.2 Relasi Drizzle ORM

```typescript
export const angkatanKurikulumRelations = relations(angkatanKurikulum, ({ one }) => ({
  programStudi: one(programStudi, {
    fields: [angkatanKurikulum.programStudiId],
    references: [programStudi.id],
  }),
  kurikulum: one(kurikulum, {
    fields: [angkatanKurikulum.kurikulumId],
    references: [kurikulum.id],
  }),
}));
```

#### 1.3 Update Relasi Tabel Terkait

Tambahkan relasi `angkatanKurikulum` di `programStudiRelations` dan `kurikulumRelations`:

```typescript
export const programStudiRelations = relations(programStudi, ({ many }) => ({
  mahasiswa: many(mahasiswa),
  dosen: many(dosen),
  mataKuliah: many(mataKuliah),
  angkatanKurikulum: many(angkatanKurikulum), // BARU
}));

export const kurikulumRelations = relations(kurikulum, ({ one, many }) => ({
  programStudi: one(programStudi, {
    fields: [kurikulum.programStudiId],
    references: [programStudi.id],
  }),
  semesterMulaiPeriode: one(periodeAkademik, {
    fields: [kurikulum.semesterMulai],
    references: [periodeAkademik.id],
  }),
  kurikulumMataKuliah: many(kurikulumMataKuliah),
  angkatanKurikulum: many(angkatanKurikulum), // BARU
}));
```

---

### Tahap 2: Penambahan Field `kelompokMataKuliah` di `kurikulum_mata_kuliah`

#### 2.1 Definisi Enum dan Field Baru

```typescript
export const kelompokMataKuliahEnum = pgEnum('kelompok_mata_kuliah', [
  'wajib_umum',      // MK wajib universitas (Pancasila, Agama, dll)
  'wajib_prodi',     // MK wajib program studi
  'pilihan',         // MK pilihan
  'tugas_akhir',     // TA/Skripsi
  'mbkm',            // MK program MBKM
  'praktik_lapangan' // PKL/Magang
]);
```

#### 2.2 Update Tabel `kurikulumMataKuliah`

```typescript
export const kurikulumMataKuliah = pgTable('kurikulum_mata_kuliah', {
  id: serial('id').primaryKey(),
  kurikulumId: integer('kurikulum_id')
    .notNull()
    .references(() => kurikulum.id, { onDelete: 'cascade' }),
  mataKuliahId: integer('mata_kuliah_id')
    .notNull()
    .references(() => mataKuliah.id, { onDelete: 'cascade' }),
  semester: integer('semester').notNull(),
  sksMataKuliah: integer('sks_mata_kuliah').notNull(),
  sksTatapMuka: integer('sks_tatap_muka'),
  sksPraktek: integer('sks_praktek'),
  sksPraktekLapangan: integer('sks_praktek_lapangan').default(0),
  sksSimulasi: integer('sks_simulasi').default(0),
  isWajib: boolean('is_wajib').default(true).notNull(),
  kelompokMataKuliah: kelompokMataKuliahEnum('kelompok_mata_kuliah').default('wajib_prodi').notNull(), // BARU
  urutan: integer('urutan').default(0), // BARU - urutan dalam semester
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

### Tahap 3: Migration Script

#### 3.1 Generate Migration

```bash
cd apps/backend
bun run db:generate
```

#### 3.2 Push Migration

```bash
bun run db:push
```

#### 3.3 Data Migration (jika ada data existing)

Buat script untuk mengisi data mapping angkatan-kurikulum berdasarkan data existing:

```typescript
// apps/backend/src/scripts/migrate-angkatan-kurikulum.ts
// Logic: Untuk setiap kurikulum yang ada, buat mapping ke angkatan berdasarkan semesterMulai
```

---

### Tahap 4: API Endpoints Baru

#### 4.1 Schema Validation

File: `apps/backend/src/schemas/angkatan-kurikulum.schema.ts`

```typescript
import { t } from 'elysia';

export const angkatanKurikulumBody = t.Object({
  angkatan: t.String({ minLength: 4, maxLength: 4 }),
  programStudiId: t.Integer(),
  kurikulumId: t.Integer(),
});

export const getAngkatanKurikulumSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Daftar Mapping Angkatan-Kurikulum',
    description: 'Mengambil semua mapping angkatan ke kurikulum dengan filter prodi.',
  },
  query: t.Object({
    prodiId: t.Optional(t.Numeric()),
    angkatan: t.Optional(t.String()),
  }),
};

export const createAngkatanKurikulumSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Assign Kurikulum ke Angkatan',
    description: 'Menetapkan kurikulum yang berlaku untuk suatu angkatan di prodi tertentu (Hanya Admin).',
  },
  body: angkatanKurikulumBody,
};

export const updateAngkatanKurikulumSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Update Mapping Angkatan-Kurikulum',
    description: 'Mengubah kurikulum yang berlaku untuk suatu angkatan (Hanya Admin).',
  },
  params: t.Object({ id: t.Numeric() }),
  body: t.Partial(angkatanKurikulumBody),
};

export const deleteAngkatanKurikulumSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Hapus Mapping Angkatan-Kurikulum',
    description: 'Menghapus mapping angkatan-kurikulum (Hanya Admin).',
  },
  params: t.Object({ id: t.Numeric() }),
};

export const getKurikulumByAngkatanSchema = {
  detail: {
    tags: ['Kurikulum'],
    summary: 'Kurikulum Berdasarkan Angkatan',
    description: 'Mengambil kurikulum yang berlaku untuk suatu angkatan di prodi tertentu.',
  },
  query: t.Object({
    angkatan: t.String(),
    prodiId: t.Numeric(),
  }),
};
```

#### 4.2 Service Layer

File: `apps/backend/src/services/angkatan-kurikulum.service.ts`

```typescript
import { and, eq } from 'drizzle-orm';
import { angkatanKurikulum, kurikulum } from '../models/schema';
import { db } from '../utils/db';

export class AngkatanKurikulumService {
  static async getAll(prodiId?: number, angkatan?: string) {
    let whereClause = undefined;
    if (prodiId && angkatan) {
      whereClause = and(eq(angkatanKurikulum.programStudiId, prodiId), eq(angkatanKurikulum.angkatan, angkatan));
    } else if (prodiId) {
      whereClause = eq(angkatanKurikulum.programStudiId, prodiId);
    } else if (angkatan) {
      whereClause = eq(angkatanKurikulum.angkatan, angkatan);
    }

    const data = await db.query.angkatanKurikulum.findMany({
      where: whereClause,
      with: {
        programStudi: true,
        kurikulum: {
          with: {
            programStudi: true,
            semesterMulaiPeriode: true,
          },
        },
      },
      orderBy: (t, { desc }) => [desc(t.angkatan)],
    });
    return data;
  }

  static async getByAngkatanProdi(angkatan: string, prodiId: number) {
    const data = await db.query.angkatanKurikulum.findFirst({
      where: and(
        eq(angkatanKurikulum.angkatan, angkatan),
        eq(angkatanKurikulum.programStudiId, prodiId)
      ),
      with: {
        kurikulum: {
          with: {
            programStudi: true,
            semesterMulaiPeriode: true,
            kurikulumMataKuliah: {
              with: { mataKuliah: true },
              orderBy: (t, { asc }) => [asc(t.semester), asc(t.urutan)],
            },
          },
        },
      },
    });
    return data || null;
  }

  static async create(data: { angkatan: string; programStudiId: number; kurikulumId: number }) {
    const [newMapping] = await db.insert(angkatanKurikulum).values(data).returning();
    return newMapping;
  }

  static async update(id: number, data: Partial<{ angkatan: string; programStudiId: number; kurikulumId: number }>) {
    const [updated] = await db.update(angkatanKurikulum).set(data).where(eq(angkatanKurikulum.id, id)).returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(angkatanKurikulum).where(eq(angkatanKurikulum.id, id)).returning();
    return deleted || null;
  }
}
```

#### 4.3 Controller

File: `apps/backend/src/controllers/angkatan-kurikulum.controller.ts`

```typescript
import { AngkatanKurikulumService } from '../services/angkatan-kurikulum.service';
import { AuthContext } from '../utils/types';

export class AngkatanKurikulumController {
  static async getAll({ query }: AuthContext<any, any>) {
    const prodiId = query?.prodiId ? parseInt(query.prodiId) : undefined;
    const angkatan = query?.angkatan;
    return await AngkatanKurikulumService.getAll(prodiId, angkatan);
  }

  static async getByAngkatanProdi({ query }: AuthContext<any, any>) {
    const { angkatan, prodiId } = query;
    const data = await AngkatanKurikulumService.getByAngkatanProdi(angkatan, parseInt(prodiId));
    return data;
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const newMapping = await AngkatanKurikulumService.create(body);
    set.status = 201;
    return newMapping;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await AngkatanKurikulumService.update(parseInt(params.id), body);
    if (!updated) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return updated;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const deleted = await AngkatanKurikulumService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Mapping berhasil dihapus' };
  }
}
```

#### 4.4 Routes

Update file: `apps/backend/src/routes/kurikulum.routes.ts`

```typescript
import { Elysia } from 'elysia';
import { KurikulumController } from '../controllers/kurikulum.controller';
import { AngkatanKurikulumController } from '../controllers/angkatan-kurikulum.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  addMataKuliahSchema,
  createKurikulumSchema,
  deleteKurikulumSchema,
  getKurikulumByIdSchema,
  getKurikulumSchema,
  removeMataKuliahSchema,
  updateKurikulumSchema,
} from '../schemas/kurikulum.schema';
import {
  createAngkatanKurikulumSchema,
  deleteAngkatanKurikulumSchema,
  getAngkatanKurikulumSchema,
  getKurikulumByAngkatanSchema,
  updateAngkatanKurikulumSchema,
} from '../schemas/angkatan-kurikulum.schema';

export const kurikulumRoutes = new Elysia({ prefix: '/kurikulum' })
  .use(authMiddleware)
  // Existing routes
  .get('/', KurikulumController.getAll, getKurikulumSchema)
  .post('/', KurikulumController.create, createKurikulumSchema)
  .get('/:id', KurikulumController.getById, getKurikulumByIdSchema)
  .put('/:id', KurikulumController.update, updateKurikulumSchema)
  .delete('/:id', KurikulumController.delete, deleteKurikulumSchema)
  .post('/:id/mata-kuliah', KurikulumController.addMataKuliah, addMataKuliahSchema)
  .delete('/:id/mata-kuliah/:mkId', KurikulumController.removeMataKuliah, removeMataKuliahSchema)
  // New routes for angkatan-kurikulum mapping
  .get('/angkatan', AngkatanKurikulumController.getAll, getAngkatanKurikulumSchema)
  .get('/angkatan/kurikulum', AngkatanKurikulumController.getByAngkatanProdi, getKurikulumByAngkatanSchema)
  .post('/angkatan', AngkatanKurikulumController.create, createAngkatanKurikulumSchema)
  .put('/angkatan/:id', AngkatanKurikulumController.update, updateAngkatanKurikulumSchema)
  .delete('/angkatan/:id', AngkatanKurikulumController.delete, deleteAngkatanKurikulumSchema);
```

---

### Tahap 5: Update Schema Validation untuk `kurikulumMataKuliah`

Update file: `apps/backend/src/schemas/kurikulum.schema.ts`

```typescript
export const addMataKuliahBody = t.Object({
  mataKuliahId: t.Integer({ default: 1 }),
  semester: t.Integer({ default: 1 }),
  sksMataKuliah: t.Integer({ default: 3 }),
  sksTatapMuka: t.Optional(t.Integer({ default: 2 })),
  sksPraktek: t.Optional(t.Integer({ default: 1 })),
  sksPraktekLapangan: t.Optional(t.Integer({ default: 0 })),
  sksSimulasi: t.Optional(t.Integer({ default: 0 })),
  isWajib: t.Optional(t.Boolean({ default: true })),
  kelompokMataKuliah: t.Optional(
    t.Union([
      t.Literal('wajib_umum'),
      t.Literal('wajib_prodi'),
      t.Literal('pilihan'),
      t.Literal('tugas_akhir'),
      t.Literal('mbkm'),
      t.Literal('praktik_lapangan'),
    ], { default: 'wajib_prodi' })
  ),
  urutan: t.Optional(t.Integer({ default: 0 })),
});
```

---

### Tahap 6: Helper Function untuk Auto-Assign Kurikulum

Tambahkan utility function untuk mendapatkan kurikulum mahasiswa berdasarkan angkatan dan prodi:

File: `apps/backend/src/utils/kurikulum-helper.ts`

```typescript
import { and, eq } from 'drizzle-orm';
import { angkatanKurikulum, kurikulum } from '../models/schema';
import { db } from '../utils/db';

/**
 * Mendapatkan kurikulum yang berlaku untuk mahasiswa berdasarkan angkatan dan prodi.
 * Jika tidak ada mapping spesifik, fallback ke kurikulum aktif di prodi tersebut.
 */
export async function getKurikulumForMahasiswa(angkatan: string, programStudiId: number) {
  // 1. Cari mapping spesifik di tabel angkatan_kurikulum
  const mapping = await db.query.angkatanKurikulum.findFirst({
    where: and(
      eq(angkatanKurikulum.angkatan, angkatan),
      eq(angkatanKurikulum.programStudiId, programStudiId)
    ),
    with: {
      kurikulum: true,
    },
  });

  if (mapping) {
    return mapping.kurikulum;
  }

  // 2. Fallback: cari kurikulum aktif di prodi tersebut
  const activeKurikulum = await db.query.kurikulum.findFirst({
    where: and(
      eq(kurikulum.programStudiId, programStudiId),
      eq(kurikulum.isAktif, true)
    ),
  });

  return activeKurikulum || null;
}
```

---

### Tahap 7: Update Seed Data

File: `apps/backend/src/scripts/seed-test-data.ts`

Tambahkan seeding untuk tabel `angkatanKurikulum`:

```typescript
// Setelah seeding kurikulum, buat mapping angkatan-kurikulum
const angkatanList = ['2022', '2023', '2024', '2025'];

for (const prodi of prodiList) {
  const kurikulumRecord = await db.query.kurikulum.findFirst({
    where: eq(kurikulum.programStudiId, prodi.id),
  });

  if (kurikulumRecord) {
    for (const angkatan of angkatanList) {
      await db.insert(angkatanKurikulum).values({
        angkatan,
        programStudiId: prodi.id,
        kurikulumId: kurikulumRecord.id,
      }).onConflictDoNothing();
    }
  }
}
```

---

## Checklist Implementasi

- [ ] **Tahap 1:** Tambah tabel `angkatan_kurikulum` di `schema.ts`
- [ ] **Tahap 2:** Tambah field `kelompokMataKuliah` dan `urutan` di `kurikulumMataKuliah`
- [ ] **Tahap 3:** Generate dan push migration
- [ ] **Tahap 4:** Buat API endpoints untuk `angkatan-kurikulum`
  - [ ] Schema validation
  - [ ] Service layer
  - [ ] Controller
  - [ ] Routes
- [ ] **Tahap 5:** Update schema validation `addMataKuliahBody`
- [ ] **Tahap 6:** Buat helper function `getKurikulumForMahasiswa`
- [ ] **Tahap 7:** Update seed data
- [ ] **Tahap 8:** Testing
  - [ ] Unit test untuk service
  - [ ] Integration test untuk API endpoints
  - [ ] Manual testing via Swagger

---

## Catatan Penting

1. **Backward Compatibility:** Perubahan ini backward compatible karena hanya menambah tabel dan field baru, tidak mengubah field existing.

2. **Migration Strategy:** Gunakan `bun run db:generate` untuk auto-generate migration dari perubahan schema.

3. **Data Existing:** Untuk data existing, perlu dibuat script migration yang mengisi tabel `angkatan_kurikulum` berdasarkan data kurikulum yang sudah ada.

4. **Neo Feeder Sync:** Field `idPddikti` di tabel `kurikulum` dan `kurikulumMataKuliah` sudah ada untuk sinkronisasi dengan Neo Feeder.

5. **Fallback Logic:** Helper function `getKurikulumForMahasiswa` memiliki fallback ke kurikulum aktif jika tidak ada mapping spesifik, memastikan sistem tetap berjalan meski mapping belum lengkap.

---

## Referensi

- [Neo Feeder PDDIKTI Documentation](https://neo.feeder.kemdikbud.go.id/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [ElysiaJS Documentation](https://elysiajs.com/)
