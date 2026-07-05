import { users } from '../models/schema';
import { db } from '../utils/db';
import { sql } from 'drizzle-orm';

async function reset() {
  console.log('=== MEMULAI RESET DATABASE ===');

  const tables = [
    'users',
    'program_studi',
    'dosen',
    'mahasiswa',
    'periode_akademik',
    'mata_kuliah',
    'kelas_kuliah',
    'dosen_pengajar_kelas',
    'tagihan',
    'krs',
    'cpmk',
    'bap',
    'presensi',
    'kompensasi_bayar',
    'bimbingan',
    'bimbingan_thread',
    'sesi_bimbingan',
    'pelanggaran',
    'komponen_nilai',
    'nilai_komponen_mahasiswa',
    'pengajuan_yudisium',
    'password_resets',
    'kurikulum',
    'kurikulum_mata_kuliah',
    'rps',
    'rps_topik',
    'rencana_evaluasi',
    'transaksi_pembayaran',
    'skema_tarif',
    'konversi_nilai',
    'skala_predikat_kelulusan',
    'pengajuan_cuti',
    'mahasiswa_keluar'
  ];

  try {
    // Kueri nama tabel yang benar-benar ada di database (public schema)
    console.log('- Memeriksa tabel yang terdaftar di database...');
    const dbTablesQuery = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    const dbTables = dbTablesQuery.rows.map((row: any) => row.tablename);
    const tablesToTruncate = tables.filter((t) => dbTables.includes(t));

    if (tablesToTruncate.length > 0) {
      console.log(`- Mengosongkan ${tablesToTruncate.length} tabel...`);
      const truncateQuery = `TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE;`;
      await db.execute(sql.raw(truncateQuery));
      console.log('- Tabel berhasil dikosongkan.');
    } else {
      console.log('- Tidak ada tabel yang perlu dikosongkan.');
    }

    // Seed kembali user admin default agar sistem tidak terkunci
    console.log('- Membuat ulang user admin default...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@simak.id';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
    const hashedPassword = await Bun.password.hash(adminPassword, {
      algorithm: 'bcrypt',
      cost: 10,
    });

    await db.insert(users).values({
      email: adminEmail,
      password: hashedPassword,
      nama: 'Admin SIMAK',
      role: 'admin',
      isActive: true,
    });
    console.log(`- User admin default (${adminEmail}) berhasil dibuat.`);
    console.log('=== RESET DATABASE SELESAI DENGAN SUKSES ===');
    process.exit(0);
  } catch (error) {
    console.error('Reset database gagal:', error);
    process.exit(1);
  }
}

reset();
