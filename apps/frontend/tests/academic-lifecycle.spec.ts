import { test, expect } from '@playwright/test';

test.describe('Academic Lifecycle E2E Test', () => {
  test.beforeEach(async ({ request }) => {
    // Reset database and seed baseline data via backend endpoint
    const res = await request.post('http://localhost:3000/e2e/reset');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.message).toBe('Database reset and seeded successfully');
  });

  test('should execute 5 major cycles: Persiapan, KRS, Perkuliahan, Penilaian, and Yudisium', async ({ page }) => {
    // Log console messages from browser
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.message));
    page.on('response', async response => {
      if (response.status() >= 400) {
        console.log(`BROWSER API ERROR: ${response.url()} status ${response.status()}`);
        try {
          console.log(`ERROR BODY:`, await response.text());
        } catch (_) {}
      }
    });
    page.on('request', request => {
      if (request.url().includes('/bap') && request.method() === 'POST') {
        console.log('BROWSER BAP POST BODY:', request.postData());
      }
    });

    // Set longer timeout for this complex E2E flow
    test.setTimeout(60000);

    // -----------------------------------------------------------------
    // SIKLUS 1: Persiapan Perkuliahan (Verifikasi Data Awal via Admin)
    // -----------------------------------------------------------------
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify academic period
    await page.click('text=Periode Akademik');
    await expect(page).toHaveURL(/\/periode-akademik/);
    await expect(page.locator('text=Ganjil 2023/2024')).toBeVisible();

    // Verify program studi
    await page.click('text=Prodi');
    await expect(page).toHaveURL(/\/program-studi/);
    await expect(page.locator('text=Teknik Informatika')).toBeVisible();

    // Verify dosen
    await page.click('text=Dosen');
    await expect(page).toHaveURL(/\/dosen/);
    await expect(page.locator('text=Dosen Wali')).toBeVisible();

    // Verify mahasiswa
    await page.click('text=Mahasiswa');
    await expect(page).toHaveURL(/\/mahasiswa/);
    await expect(page.locator('text=Mahasiswa Bimbingan')).toBeVisible();

    // Verify mata kuliah
    await page.click('text=Mata Kuliah');
    await expect(page).toHaveURL(/\/mata-kuliah/);
    await expect(page.locator('text=Pemrograman Web')).toBeVisible();

    // Verify kelas kuliah
    await page.click('text=Kelas Kuliah');
    await expect(page).toHaveURL(/\/kelas-kuliah/);
    await expect(page.locator('text=1A')).toBeVisible();

    // Logout
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);

    // -----------------------------------------------------------------
    // SIKLUS 2: KRS & Bimbingan (Mahasiswa Mengisi KRS, Dosen Menyetujui)
    // -----------------------------------------------------------------
    // Login as Mahasiswa
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Fill KRS
    await page.click('text=Kartu Rencana Studi (KRS)');
    await expect(page).toHaveURL(/\/krs/);

    await page.click('text=Tambah Kontrak KRS');
    // Wait for modal options to load and be attached in the DOM
    await page.waitForSelector('label:has-text("Kelas Kuliah Pilihan") + select option', { state: 'attached' });
    
    // Choose Pemrograman Web and submit
    await page.click('button:has-text("Kontrak Kelas")');

    // Verify added and pending approval (KRS table renders class name "1A" and student name)
    await expect(page.locator('text=Mahasiswa Bimbingan')).toBeVisible();
    await expect(page.locator('text=1A')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();

    // Go to Bimbingan to request approval
    await page.click('text=Bimbingan Akademik');
    await expect(page).toHaveURL(/\/bimbingan/);
    // Wait for profile and student bimbingan to load completely
    await expect(page.locator('text=Status Kelayakan Ujian')).toBeVisible();

    await page.fill('input[placeholder="Tulis pesan bimbingan..."]', 'Halo Pak, saya telah mengontrak KRS Pemrograman Web. Mohon persetujuannya.');
    await page.click('button:has-text("Kirim")');

    // Verify message is visible in chat history
    await expect(page.locator('text=Halo Pak, saya telah mengontrak KRS Pemrograman Web. Mohon persetujuannya.')).toBeVisible();

    // Logout Mahasiswa
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);

    // Login as Dosen
    await page.fill('input[type="email"]', 'dosen@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Approve KRS
    await page.click('text=Kartu Rencana Studi (KRS)');
    await expect(page).toHaveURL(/\/krs/);

    // Handle batch approval confirm dialog
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Apakah Anda yakin ingin menyetujui seluruh KRS');
      await dialog.accept();
    });
    await page.click('text=Setujui Semua KRS');

    // Verify KRS status changed to Disetujui
    await expect(page.locator('text=Disetujui')).toBeVisible();

    // Go to Bimbingan to reply and set Exam Eligibility
    await page.click('text=Bimbingan Akademik');
    await expect(page).toHaveURL(/\/bimbingan/);

    // Click Mahasiswa in left panel specifically by matching their unique NIM text
    await page.click('button:has-text("NIM: 20200001")');
    
    // Wait for the chat text to load from Mahasiswa
    await expect(page.locator('text=Halo Pak, saya telah mengontrak KRS Pemrograman Web. Mohon persetujuannya.')).toBeVisible();

    // Send chat reply
    await page.fill('input[placeholder="Balas konsultasi..."]', 'Halo, KRS Anda sudah disetujui. Silakan belajar dengan giat.');
    await page.click('button:has-text("Kirim")');

    // Check Setujui Kelayakan Ujian and Save
    await page.check('input[type="checkbox"]');
    await page.fill('textarea[placeholder="Tulis ringkasan konsultasi mahasiswa di sini..."]', 'Mahasiswa berkonsultasi mengenai rencana studi semester ganjil.');

    // Save triggers window alert dialog in Bimbingan.tsx
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Bimbingan berhasil diperbarui');
      await dialog.accept();
    });
    await page.click('button:has-text("Simpan Perubahan")');

    // Logout Dosen
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);

    // -----------------------------------------------------------------
    // SIKLUS 3: Perkuliahan & Presensi (Dosen Isi BAP & Presensi Alpa, Admin Clear Fine)
    // -----------------------------------------------------------------
    // Login as Dosen
    await page.fill('input[type="email"]', 'dosen@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to Jurnal & Presensi
    await page.click('text=Jurnal & Presensi');
    await expect(page).toHaveURL(/\/jurnal-presensi/);

    // Select class
    await page.selectOption('label:has-text("Pilih Kelas Kuliah") + select', { label: 'Pemrograman Web (Kelas 1A)' });

    // Create a new BAP (modal triggers)
    await page.click('text=Buat Pertemuan / BAP');

    // Fill BAP form inside modal
    await page.fill('label:has-text("Tanggal Pertemuan") + input', '2023-10-01');
    await page.fill('label:has-text("Pertemuan Ke") + input', '1');
    await page.selectOption('select:has(option:has-text("Target Pembelajaran CPMK"))', { label: '[CPMK1] Menguasai Pemrograman Web' });
    await page.fill('label:has-text("Catatan / Topik Materi Kuliah") + input', 'Pengenalan HTML & CSS');
    await page.fill('label:has-text("Durasi Kelas (Menit)") + input', '100');
    await page.click('button:has-text("Simpan & Buka Presensi")');

    // Select the newly created BAP
    await page.selectOption('label:has-text("Pilih Pertemuan / BAP") + select', { index: 1 });

    // Mark Mahasiswa as ALPA
    await page.click('button:has-text("ALPA")');

    // Save attendance (triggers toast only)
    await page.click('button:has-text("Simpan Presensi")');

    // Logout Dosen
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);

    // Login as Admin to clear fine (tanggungan kompensasi)
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to Laporan Kompensasi
    await page.click('text=Laporan Kompensasi');
    await expect(page).toHaveURL(/\/laporan-kompensasi/);

    // Sisa tanggungan should be 500 minutes (100 * 5)
    await expect(page.locator('text=500 Menit').first()).toBeVisible();

    // Click Kelola Detail
    await page.click('button:has-text("Kelola Detail")');

    // Clear fine (input payment) (triggers toast only)
    await page.click('button:has-text("Input Pelunasan")');
    await page.fill('label:has-text("Jumlah Pengurangan (Menit)") + input', '500');
    await page.fill('label:has-text("Tanggal Kegiatan") + input', '2023-10-02');
    await page.fill('label:has-text("Keterangan Kegiatan Kompensasi") + textarea', 'Kerja bakti kebersihan laboratorium');
    await page.click('button:has-text("Simpan Pelunasan")');

    // Verify sisa tanggungan is now 0 Menit
    await expect(page.locator('text=0 Menit').first()).toBeVisible();

    // Close detail modal
    await page.click('button:has-text("Tutup")');

    // Logout Admin
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);

    // -----------------------------------------------------------------
    // SIKLUS 4: Penilaian dan KHS (Dosen Isi Bobot & Nilai, Mahasiswa Buka KHS)
    // -----------------------------------------------------------------
    // Login as Dosen
    await page.fill('input[type="email"]', 'dosen@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to KHS
    await page.click('text=Hasil Studi & KHS');
    await expect(page).toHaveURL(/\/khs/);

    // Click tab Input Nilai Kelas
    await page.click('button:has-text("Input Nilai Kelas")');

    // Select class
    await page.selectOption('label:has-text("Kelas Kuliah") + select', { label: '20231 - Pemrograman Web (1A)' });

    // Set component weights
    await page.click('button:has-text("Tambah Komponen")');
    await page.fill('input[placeholder="Nama Komponen"] >> nth=0', 'Tugas');
    await page.fill('input[placeholder="Bobot"] >> nth=0', '30');

    await page.click('button:has-text("Tambah Komponen")');
    await page.fill('input[placeholder="Nama Komponen"] >> nth=1', 'UTS');
    await page.fill('input[placeholder="Bobot"] >> nth=1', '30');

    await page.click('button:has-text("Tambah Komponen")');
    await page.fill('input[placeholder="Nama Komponen"] >> nth=2', 'UAS');
    await page.fill('input[placeholder="Bobot"] >> nth=2', '40');

    // Save weights (triggers toast only)
    await page.click('button:has-text("Simpan Bobot Komponen")');

    // Fill student grades: Tugas = 80, UTS = 85, UAS = 90
    await page.fill('input[placeholder="0"] >> nth=0', '80');
    await page.fill('input[placeholder="0"] >> nth=1', '85');
    await page.fill('input[placeholder="0"] >> nth=2', '90');

    // Save grades (triggers toast only)
    await page.click('button:has-text("Simpan Nilai")');

    // Lock grades (triggers window confirm dialog)
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Apakah Anda yakin ingin mengunci nilai');
      await dialog.accept();
    });
    await page.click('button:has-text("Kunci Nilai")');

    // Logout Dosen
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);

    // Login as Mahasiswa to view KHS
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to KHS
    await page.click('text=Hasil Studi & KHS');
    await expect(page).toHaveURL(/\/khs/);

    // KHS should be visible and not blocked (we cleared the fine and there is no unpaid SPP)
    await expect(page.locator('text=IP Semester')).toBeVisible();
    await expect(page.locator('text=4.00').first()).toBeVisible(); // 85.50 translates to A (4.00)
    await expect(page.locator('text=Pemrograman Web')).toBeVisible();
    await expect(page.locator('text=85.5')).toBeVisible();
    await expect(page.locator('td', { hasText: /^A$/ })).toBeVisible();

    // -----------------------------------------------------------------
    // SIKLUS 5: Yudisium (Pengajuan oleh Mahasiswa, Verifikasi & Kelulusan oleh Admin)
    // -----------------------------------------------------------------
    // Go to Yudisium
    await page.click('text=Evaluasi Yudisium');
    await expect(page).toHaveURL(/\/yudisium/);

    // Fill Yudisium Form
    await page.fill('textarea[placeholder="Tulis judul TA Anda secara lengkap..."]', 'Rancang Bangun Sistem Informasi Akademik Vokasi');
    await page.fill('input[type="number"]', '500'); // TOEFL score

    // Check all checklists
    await page.check('input[type="checkbox"] >> nth=0');
    await page.check('input[type="checkbox"] >> nth=1');
    await page.check('input[type="checkbox"] >> nth=2');

    // Submit (triggers toast only)
    await page.click('button:has-text("Ajukan Yudisium")');

    // Verify submitted status
    await expect(page.locator('text=Status: DIAJUKAN')).toBeVisible();

    // Logout Mahasiswa
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);

    // Login as Admin to verify
    await page.fill('input[type="email"]', 'admin@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to Yudisium
    await page.click('text=Evaluasi Yudisium');
    await expect(page).toHaveURL(/\/yudisium/);

    // Click Verify
    await page.click('button:has-text("Verifikasi")');

    // Verify modal options and select Disetujui
    await page.selectOption('label:has-text("Status Kelulusan Yudisium") + select', { label: 'Disetujui (Dinyatakan LULUS)' });
    await page.fill('textarea[placeholder="Tulis alasan jika ditolak, atau catatan wisuda..."]', 'Selamat, Anda dinyatakan lulus dengan predikat Pujian');

    // Save verify (triggers toast only)
    await page.click('button:has-text("Simpan Verifikasi")');

    // Logout Admin
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);

    // Login as Mahasiswa to verify graduation status
    await page.fill('input[type="email"]', 'mahasiswa@simak.id');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to Yudisium
    await page.click('text=Evaluasi Yudisium');
    await expect(page).toHaveURL(/\/yudisium/);

    // Verify status is disetujui and LULUS
    await expect(page.locator('text=Status: DISETUJUI')).toBeVisible();
    await expect(page.locator('span', { hasText: /^lulus$/i }).first()).toBeVisible();
    await expect(page.locator('text=Selamat! Anda telah dinyatakan lulus Yudisium')).toBeVisible();

    // Done!
  });
});
