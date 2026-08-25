(NEXT TASKS)

DONE (feat/konfigurasi-sistem, 2026-08-07):
- Menu "Integrasi Data" diubah menjadi "Konfigurasi" dengan submenu: Manajemen User, Akses Role Group, Scope Program Studi, Parameter Sistem, Sinkronisasi PDDIKTI, Usulan & Evaluasi, About & Versioning.
- Implementasi RBAC matrix, scope prodi per user, parameter kompensasi dinamis, dan sistem versioning (dari package.json).
- Parameter kompensasi (batas harian, pengali denda) tidak lagi di-hardcode, dibaca dari `system_parameters`.

Rombol Praktikum:

- buatkan link QR untuk mahasiswa mendaftar secara mandiri ke kelompok praktikum yang dibuka oleh dosen/instruktur

/monitoring-bimbingan

- terapkan pagination, saat ini jumlah mahasiswa bimbingan mencapai ratusan sehingga tidak efisien untuk dimuat sekaligus

Penomoran version

- DONE: Sistem versioning dibuat (baca `package.json` + build timestamp + git commit hash, render `version.json` saat build, tampil pada About & footer sidebar).

Configuration:

- DONE: Role management dan access control (RBAC matrix) diimplementasikan di bawah modul Konfigurasi.

Possible Improvements

- Error Recovery Strategy: Consider adding automatic retry logic with exponential backoff for transient SSH/network failures (currently fails immediately).

- Dump Size Validation: While the 10KB sanity check is good, consider adding an upper bound check to catch unusually large dumps that might indicate corruption or runaway logs.

- Sanitization Verification: Add optional post-sanitization SQL queries to verify that passwords were actually reset and emails were masked (currently assumes success).

- Logging Destination: Document whether AUDIT_LOG_PATH should point to persistent storage outside the working directory to ensure logs survive working directory cleanup.

- Migration Error Handling: The safe-migrate step logs warnings but continues on failure—consider making this configurable (fail-on-error vs. warn-on-error modes).

- Rombel Praktik
-

PDDIKTI

- PR Baru Menarik Data dari Neofeeder PDDIKTI

/bimbingan (done)

- buat lebih sederhana, yang utama adalah menampilkan riwayat bimbingan oleh dosen setiap semester (berupa asistensi, tugas akhir, skripsi, dan lainnya). Fitur chat bersifat tambahan / fasilitas untuk memudahkan komunikasi.

-cek apakah sudah ada fitur yang membolehkan user untuk memberikan evaluasi / review terkait aplikasi sheingga pengembang dapat dengan mudah mempertimbangkan improvement sistem.
fitur ini sifatnya modular yang dapat diaktifkan/nonaktifkan sewaktu-waktu (done)

halaman /bimbingan (progres)

- bolehkan user mencari mahasiswa bimbingan berdasarkan nama, nim, angkatan, dan prodi.
- ganti panel chat dengan riwayat dan pengelolaan Sesi bimbingan
- sediakan drop down pilihan jenis bimbingan pada form bimbingan

halaman /mahasiswa (progres)

- bolehkan menetapkan dosen PA mahasiswa yang dicentang sekaligus melalui tombol aksi massal.

VPS (done)

- buatkan plan agar db staging menarik data dari db production secara berkala, agar data yang digunakan dalam staging mendekati kondisi sebenarnya tanpa mengganggu db utama production

---

/jurnal-presensi

- Materi utama tidak diperlukan, cukup pilihan multi-topik
  relasi tidak valid. referensi ID tidak ditemukan.

/jurnal-presensi

- bolehkan dosen untuk memilih lebih dari saru topik dalam satu pertemuan untuk mengakomodir materi/topik yang berlanjut pada sesi berikutnya

- buatkan fitur untuk membuat jurnal BAP kelas praktikum. Kelas Praktikum berupa kelompok/Rombel yang diasuh oleh instruktur yang ditentukan oleh dosen pengampu. Di dalam rombel terdapat mahasiswa-mahasiswa yang mengikuti praktikum tersebut. Bolehkan instruktur / dosen pengampuh untuk membuat rombel sebelum praktik di mulai. Setiap rombel akan melakukan beberapa sesi praktik setiap hari yang perlu dicatat dalam presensi dan jurnal BAP.

/dashboard

- sesuaikan dashboard dengan profil user. apabila dosen A, maka dashboard yang muncul adalah data yang relevan untuk dosen A. kelas yang diampu hanya kelas yang diajarkan saja.

/dosen

- validasi gagal saat edit, bolehkan user untuk mengosongkan nik dan tgl lahir

/kelas-kuliah

- gunakan searchable dropdown untuk mencari dosen pengampuh mata kuliah

/presensi-apel

tombol buat kelompok baru hanya untuk admin

+fitur tambahan:

- bolehkan user untuk memberiksan evaluasi dan usul pengembangan sistem
- dukungan PWA pada project

=========================

02/08/2026 (COMPLETE)

/jurnal-presensi

- Di sisi dosen, hanya muculkan mata kuliah yang diajar saja, jangan keseluruhan kelas
- bolehkan user untuk mengetikkan kode/nama mata kuliah untuk memfilter alih-alih memilih dari drop down

/pengguna

- bolehkan super admin untuk menambahkan
- untuk admin dan prodi, berikan pengaturan cakupan/scope prodi dapat lebih dari satu.
- buatkan escape tools melalui cli yang memungkinkan untuk membuat/mengambil alih super admin

/mahasiswa

- bolehkan user untuk memfilter mahasiswa yang belum punya akun
- proses membuat akun massal membutuhkan waktu yang relatif lebih lama, mungkin lebih baik apabila dilakukan di sisi server, sehingga user dapat beralih pada aktivitas lain. apabila proses selesai, user akan mendapatkan notifikasi.

/krs
bolehkan admin dan prodi untuk menyetujui krs

- pada sisi dosen krs yang muncul hanya KRS dari mahasiswa bimbingannya saja.

/jurnal-presensi

- hilangkan pilihan CPMK pada jurnal BAP. CPMK otomatis terkait dengan topik pertemuan pada RPS

/presensi-apel

- bolehkan pengguna untuk memasukkan catatan/keterangan baik pada sesi maupun pada tiap mahasiswa yang tidak hadir

/jurnal-presensi

- gabungkan antara text input pencarian dengan drop down kelas kuliah, mungkin menjadi komponen searchable dropdown.

/kelas-kuliah

- bolehkan user mencari menggunakan nama mata kuliahnya
