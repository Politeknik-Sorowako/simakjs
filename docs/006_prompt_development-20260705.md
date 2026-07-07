Buatkan issue.md berisi planning untuk membuat projek fullstack baru dalam folder ini dengan memperhatikan ketentuan berikut:

- Sistem Informasi Akademik untuk vokasi
- Mendukun gintegrasi dengan feeder PDDIKTI
- Didevelop lokal untuk dideploy pada VPS Cloud menggunakan container
- menggunakan Bun
- Backend menggunakan ElysiaJS sebagai microservices REST API
- PostgreSQL
- ORM Drizzle
- dan swagger untuk mendokumentasiakan REST API
- Frontend menggunakan solidjs

jangan terlalu low level atau detail
cukup instruksikan secara high level

dokumen planning ini akan digunakan junior programmer atau model yang lebih murah untuk implementasi

---

Kita akan fokus pada BACKEND

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

buatkan unit test untuk semua API yang tersedia

setiap skenario, hapus datanya terlebih dahulu agar konsisten

buat skenario test per API selengkap mungkin

jangan terlalu detail instruksinya, buatkan saja skenario apa saja yang harus di test, lalu model AI yang lebih murah atau junior programmer akan membuat implementasinya sesuai skenario

---

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

lengkapi fitur swagger pada project ini, sehingga user lain yang ingin menggunakan API di app ini bisa mempelajarinya dengan mudah.
sertakan contoh input datanya secara lengkap, beserta response untuk setiap skenario end point.

Buatkan tahapan untuk mengimplementasi untuk fitur ini lebih detail agar dapat diimplementasioleh model AI yang lebih murah atau junior programmer.

---

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

lengkapi fitur swagger pada project ini, sehingga user lain yang ingin menggunakan API di app ini bisa mempelajarinya dengan mudah.
sertakan contoh input datanya secara lengkap, beserta response untuk setiap skenario end point.

Buatkan tahapan untuk mengimplementasi untuk fitur ini lebih detail agar dapat diimplementasioleh model AI yang lebih murah atau junior programmer.

---

update README.md dengan memberikan informasi dan maksud pembuatan aplikasi ini, arsitektur, struktur folderdan filenya, jelaskan juga dengan lengkap API yang tersedia, skema database yang ada, cara setup project, teknologi dan library stack yang digunakan, cara run aplikasi, dan cara deploy untuk production.

Agar supaya junior programmer memahami secara komprehensif mengenai projek ini

---

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

mengubah struktur folder backend/src dengan ketentuan sebagai berikut:

- routes: berisi routing elysiajs
- controllers: berisi logic business
- models: berisi model drizzle orm
- services: berisi service
- schemas: berisi schema validation
- middlewares: berisi middleware elysiajs
- utils: berisi utility function
- plugins: berisi plugin elysiajs
- app.ts: berisi konfigurasi aplikasi elysiajs
- .env: berisi environment variables

REFACTORING code yang sudah ada di folder backend/src agar sesuai dengan arsitektur yang sudah direncanakan, pastikan fungsionalitas tetap berjalan. dan

Buatkan tahapan untuk mengimplementasi agar dapat diimplementasi oleh model AI yang lebih murah atau junior programmer.

---

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

1. Dapatkan definisi struktur database master data yang ada pada feeder PDDIKTI (referensi tabel, relasi, dan tipe data)
2. Lakukan analisis untuk menentukan bagaimana struktur database lokal tersebut harus dibuat pada PostgreSQL agar optimal dan memenuhi kebutuhan aplikasi
3. Definisikan skema tabel yang akan digunakan pada database lokal tersebut (termasuk tabel utama dan tabel referensi yang diperlukan)
4. Berikan rekomendasi database lokal mana yang perlu dibuat (misalnya: tabel mahasiswa, prodi, dosen, mata kuliah, kelas, nilai, dll.)
5. Rancang skema database tersebut menggunakan Drizzle ORM, pastikan sesuai dengan struktur yang direkomendasikan dan siap untuk diimplementasikan di database lokal

Buatkan file issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah agar mudah diimplementasikan

---

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

1. Dapatkan definisi struktur database master data yang ada pada feeder PDDIKTI (referensi tabel, relasi, dan tipe data)
2. Lakukan analisis untuk menentukan bagaimana struktur database lokal tersebut harus dibuat pada PostgreSQL agar optimal dan memenuhi kebutuhan aplikasi
3. Definisikan skema tabel yang akan digunakan pada database lokal tersebut (termasuk tabel utama dan tabel referensi yang diperlukan)
4. Berikan rekomendasi database lokal mana yang perlu dibuat (misalnya: tabel mahasiswa, prodi, dosen, mata kuliah, kelas, nilai, dll.)
5. Rancang skema database tersebut menggunakan Drizzle ORM, pastikan sesuai dengan struktur yang direkomendasikan dan siap untuk diimplementasikan di database lokal

Buatkan file issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah agar mudah diimplementasikan

---

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

Buatkan endpoint CRUD pada masing-masing tabel utama lengkap dengan tahapan pembuatan swaggernya dengan dokumentasi lengkap

deskripsikan perencanaan secara sederhana untuk difahami junior programmer atau model yang lebih murah

---

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

1. Buatkan dokumentasi masing-masing endpoint yang ada, lengkap dengan contoh input dan contoh responsenya.
2. Kelompokkan setiap endpoint sesuai nama fungsi masing-masing.

deskripsikan perencanaan secara sederhana untuk difahami junior programmer atau model yang lebih murah

---

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

1. buatkan tahapan deploy ke VPS
2. Aktifkan beberapa branch untuk membedakan versi yang stable (production), versi pengembangan (development), dan versi testing
3. Aktifkan CI/CD sehingga setiap perubahan pada stream production dapat langsung terimplementasi pada VPS

deskripsikan perencanaan secara sederhana untuk difahami junior programmer atau model yang lebih murah

---

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

1. Buatkan skema role based terhadap setiap endpoint pada API agar hanya diakses oleh user yang memiliki hak akses
2. lindungi layanan API agar diakses sesuai skema role pengguna. karena saat ini saya melihat API dan swagger terlalu terbuka dan dapat diakses oleh siapa saja

deskripsikan perencanaan secara sederhana untuk difahami junior programmer atau model yang lebih murah

---

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

1. sematkan logo kampus pada aplikasi
2. lebar side bar menyesuaikan dengan ukuran layar
3. Sediakan mekanisme lupa password
4. Link profil dan logout letakkan di sidebar bawah bersama Nama User
5. Gunakan desain dan icon yang lebih elegan dengan nuansa biru menggambarkan kedalaman ilmu vokasi
6. Sediakan pilihan warna tema untuk beralih ke mode night di pojok kanan atas dan juga tersimpan pada profil user masing-masing
7. Sub menu dapat di expand/colapse.

deskripsikan perencanaan secara sederhana untuk difahami junior programmer atau model yang lebih murah

---

Buatkan issue.md berisi perencanaan yang nanti akan diimplementasikan oleh junior programmer atau model yang lebih murah.

isi dari planningnya adalah sebagai berikut:

1. tampilkan username (read only) pada form untuk reset password
2. pastikan semua teks berwarna kontras dengan latar komponennya seperti pada impor

deskripsikan perencanaan secara sederhana untuk difahami junior programmer atau model yang lebih murah

--

1. buatkan modul untuk menyusun kurikulum, mata kuliah dan RPS
2. Buatkan fitur impor untuk menambahkan data pada data utama/master.
3. Munculkan topik/bahasan pada RPS available pada berita acara kperkuliahan (BAP)

---

saya menemukan beberapa masalah pada aplikasi:

1. saat mencoba menyimpan deskripsi pada /rps muncul respons "Relasi tidak valid. Referensi ID tidak ditemukan"
2. Halaman /rps harusnya tidak membolehkan input rencana evaluasi lebih dari 100%
3. Ketika tombol Generate tagihan diklik pada halaman /keuangan konfirmasi untuk membuat tagihan muncul, namun ke periode semester yang salah
4. Saat akan menyimpan BAP Baru pada halaman /jurnal-presensi, muncul error "Relasi tidak valid. Referensi ID tidak ditemukan"

---

1. Cegah aplikasi untuk plot dosen yang sama lebih dari sekali pada satu kelas
2. Bekum ada fitur untuk mengedit Detail BAP
3. Pada halaman /pelanggaran, saat input pelanggaran terdapat error pada isian jenis pelanggaran
4. Pada modul input nilai kelas di halaman /khs, ada beberapa kendala:
   - Sulit menginput bobot nilai pada halaman /khs, kursor selalu berpindah dari isian aktif saat user mencoba mengedit baris tertentu. Berikan fitur mengambil bobot dari definisi RPS, jika ada.
   - NIM / Nama mahasiswa tidak muncul pada input nilai kelas halaman /khs
   - Gagal menyimpan, Saat mencoba menyimpan nilai kelas pada halaman /khs
   - Sebaiknya input nilai kelas dibuatkan menu terpisah dari KHS dan transkrip.

--
/laporan-kompensasi

1. Bolehkan mengedit log penyelasaian kompentsasi

---

1. Halaman input-nilai

- Hitung nilai akhir sesuai bobot yang telah ditentukan.
- Error Failed to fetch saat menyimpan nilai

2. Halaman /khs

- Data tidak muncul, kemungkinan karena tidak ada pilihan periode yang sesuai

--
Tagihan

1. Bagaimana menetapkan nilai tagihan?
2. bolehkan mahasiswa untuk membayar dua kali dengan nominal yang ditentukan

Bimbingan Akademik

1. Buatkan riwayat Bimbingan Akademik, sehingga mahasiswa dapat melihat riwayat bimbingan akademik yang telah dilakukan. Bimbingan sebelum UTS minimal sebanyak 1 kali dan sebelum UAS minimal telah melakukan bimbingan sebanyak 3 kali
2. buat fitur obrolan antara bimbingan dosen dengan mahasiswa berjalan stream realtime, obrolan langsung muncul di kedua belah pihak tanpa perlu refresh halamannya.

Evaluasi Yudisium

1. Bolehkan admin untuk menginput mahasiswa yang akan yudisium.

---

Tagihan

1. bolehkan untuk mengoreksi kesalhan input pada tagihan dan pembayarannya.
2. Bolehkan nominal tagihan berbeda tiap angkatan

Bimbingan Akademik

1. Ubah bagian TIndakan DOsen PA menjadi fitur catatan riwayat bimbingan oleh dosen akademik, yang nantinya dapat dicetak/dilaporkan sebagai pemebuhan Bebak Kerja Dosen (BKD). Catatan Bimbingan merangkum permasalahan yang dihadapi mahasiswa dan solusi/masukan yang diberikan dosen, tanggal bimbingan, semester berjalan. Catatan ini dapat dilihat oleh mahasiswa yang bersangkutan dan dimonitor oleh admin dan prodi.

User Management

1. Bolehkan user untuk mengimpor pengguna

KHS dan Transkrip

1. Buatkan fitur untuk menetapkan rentang nilai huruf dan predikat terhadap nilai mata kuliah
2. Buatkan fitur untuk menetapkan rentang predikat kelulusan mahasiswa pada transkrip

Workspace

1. buatkan fitur penetapan fitur nilai global prodi dan tahun akademik yang ditampilkan dalam halaman sebagai nilai default saat berpindah halaman.

---

Saya perlu meluruskan proses/uses cases yang terjadi pada "Bimbingan Akademik"

1. Bimbingan akademik dilakukan tiap semester minimal sebanyak tiga kali
2. Bimbingan akademik perlu merekam riwayat bimbingan untuk dilampirkan dalam laporan BKD. Rangkum jumlah bimbingan dalam laporan BKD per semester.
3. Daftar mahasiswa yang muncul di sisi dosen hanya mahasiswa yang diasuh oleh Bimbingan Akademik
4. Dosen perlu mendapatkan informasi: jumlah pelanggaran, jumlah kompensasi, nilai/KHS semester lalu hingga semester berjalan
5. Mahasiswa dapat melihat riwayat bimbingan yang telah dilakukan
6. Fitur chat bersifat opsional hanya memfasilitasi komunikasi dosen dan mahasiswa yang terpisah jarak. Dosen dapat mengosongkan thread chat yang ada dan membuat thread baru.

---

Bimbingan

1. Isi panel Laporan BKD berupa rekap bimbingan akademik tidak muncul pada hasil cetak
2. Buatkan modul untuk menetapkan relasi dosen PA dan mahasiswa bimbingannya. Relasi ini akan digunakan untuk membatasi akses data dosen PA hanya dapat mengakses mahasiswa bimbingannya

---

1. Sesuaikan nilai huruf/mutu pada Halaman input Nilai Kelas mengikuti Aturan Konversi yang ditetapkan. Apabila aturan konversi belum ada, berikan notifikasi atau pesan agar admin menetapkan aturan konversi terlebih dahulu.

---

1. sediakan kolom password pada impor pengguna, kalau password kosong gunakan nilai email sebagai password default
2. periksa kenapa belum ada data dalam halaman KHS, padahal sudah ada nilai kelas yang diinput, apakah perlu ada skema generate KHS atau baiknya seperti apa?
3. periksa penyebab halaman yudisium kosong

---

implementasikan dan selesaikan masalah berikkut:

1. Bolehkan impor KRS
2. tombol setujui semua KRS masih belum berhasil menyetujui semua yang KRS pending. cuma 1 KRS saja yang berhasil.
3. KHS masih belum muncul, padahal KRS sudah approve dan nilai sudah dikunci

---

implementasikan dan selesaikan masalah berikkut:

1. bolehkan Admin mengedit profil dan mereset password pengguna
2. Nama dan NIM mahasiswa di cetak KHS hanya tampil ketika login sebagai mahasiswa, namun N/A ketika login sebagai admin. Untuk itu perbaiki program sehingga Admin dapat mencetak KHS bahkan secara massal.
3. Detail mata kuliah pada halaman transkrip tidak muncul
4. Sesuaikan ketentuan status Bimbingan Akademik tidak perlu melihat Jumlah interaksi/chat bimbingan, cukup melihat jumlah riwayat bimbingan yang diinput dosen PA minimal 1 kali untuk mengikuti UTS dan minimal 3 kali untuk mengikuti UAS

---

Fitur untuk membuat akun mahasiswa dan dosen secara massal dari halaman dosen dan mahasiswa

--
Buatkan fitur pengajuan Cuti dan penonaktifan kuliah (Keluar, Drop Out, lainnya)

opencode run fitu input cuti mahasiswa perlu penyesuaian berikut: 1. gabung text input cari dan pilih mahasiswa pada input cuti mahasiswa menjadi searchable dropdown; 2. tambahkan field semester mulai cuti dan semester berakhir. secara default 2 semester

---

2. Rencanakan pembaruan dashboard berdasarkan data yang terkumpul. Sesuaikan dashboard untuk role masing-masing pengguna.

1.
1. Laporan

====

lakukan code review pada perubahan code di branch ini.
buatkan perintah git untuk memberikan komentar pada PR 54 untuk saya jalankan di terminal

---

buatkan perintah git untuk merge PR ke branch development, menghapus branchnya, dan menutup PRnya

---

buatkan command git untuk membuat issue baru dari tinjauan di atas untuk saya tempelkan pada trerminal
