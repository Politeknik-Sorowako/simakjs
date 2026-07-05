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
    console.log('- Mengosongkan seluruh tabel...');
    const truncateQuery = `TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE;`;
    await db.execute(sql.raw(truncateQuery));
    console.log('- Seluruh tabel berhasil dikosongkan.');

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
