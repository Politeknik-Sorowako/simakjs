import { eq } from 'drizzle-orm';
import {
  dosen,
  kurikulum,
  kurikulumMataKuliah,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  programStudi,
  users,
} from '../models/schema';
import { db } from '../utils/db';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const INDO_FIRST_NAMES = [
  'Ahmad',
  'Aditya',
  'Arif',
  'Bagus',
  'Budi',
  'Chandra',
  'Dedi',
  'Dimas',
  'Eko',
  'Fajar',
  'Galih',
  'Hadi',
  'Hendra',
  'Indra',
  'Joko',
  'Kevin',
  'Lutfi',
  'Muhammad',
  'Nugroho',
  'Prasetyo',
  'Rian',
  'Rudi',
  'Satria',
  'Taufik',
  'Wahyu',
  'Yudi',
  'Yusuf',
  'Zainal',
  'Andi',
  'Rendra',
  'Anisa',
  'Citra',
  'Dewi',
  'Diana',
  'Eka',
  'Fitri',
  'Gita',
  'Indah',
  'Kartika',
  'Laras',
  'Mega',
  'Novi',
  'Putri',
  'Rina',
  'Sari',
  'Tias',
  'Wulan',
  'Yuni',
  'Amalia',
  'Siti',
  'Bambang',
  'Cahyo',
  'Dharma',
  'Farhan',
  'Gilang',
  'Hafizh',
  'Irfan',
  'Junaedi',
  'Kurnia',
  'Lukman',
  'Maulana',
  'Naufal',
  'Oki',
  'Pandu',
  'Rahmat',
  'Soleh',
  'Teguh',
  'Utomo',
  'Viktor',
  'Wawan',
  'Zaky',
  'Ayu',
  'Bella',
  'Clarissa',
  'Della',
  'Elisa',
  'Febri',
  'Grace',
  'Hana',
  'Intan',
];

const INDO_LAST_NAMES = [
  'Pratama',
  'Wibowo',
  'Saputra',
  'Hidayat',
  'Kurniawan',
  'Santoso',
  'Gunawan',
  'Setiawan',
  'Wijaya',
  'Siregar',
  'Nasution',
  'Lubis',
  'Harahap',
  'Ginting',
  'Tarigan',
  'Sembiring',
  'Pohan',
  'Simanjuntak',
  'Sitompul',
  'Manurung',
  'Rahman',
  'Sholeh',
  'Fauzi',
  'Hakim',
  'Ramadhan',
  'Akbar',
  'Sidiq',
  'Hadi',
  'Rizki',
  'Utomo',
  'Putri',
  'Sari',
  'Lestari',
  'Wulandari',
  'Rahmawati',
  'Fitriani',
  'Astuti',
  'Wahyuni',
  'Kartikasari',
  'Anggraini',
  'Puspitasari',
  'Indah',
  'Utami',
  'Dewi',
  'Hapsari',
  'Wardani',
  'Kusuma',
  'Kusumawardani',
  'Pratiwi',
  'Safitri',
  'Baskoro',
  'Danuar',
  'Firmansyah',
  'Gozali',
  'Halim',
  'Irawan',
  'Jaelani',
  'Kusnan',
  'Laksana',
  'Mulyono',
  'Nugraha',
  'Oktavian',
  'Pambudi',
  'Qodir',
  'Riyadi',
  'Supriadi',
  'Tanjung',
  'Utama',
  'Wicaksono',
  'Zulkarnain',
];

const DOSEN_TITLES_BEFORE = ['Dr.', 'Ir.', 'Drs.', 'Dra.', 'Prof. Dr.'];
const DOSEN_TITLES_AFTER = ['M.T.', 'M.Kom.', 'M.Sc.', 'M.B.A.', 'Ph.D.', 'M.M.'];

function generateLecturerName(isMale: boolean): string {
  const first = pickRandom(INDO_FIRST_NAMES.slice(isMale ? 0 : 50, isMale ? 50 : 100));
  const last = pickRandom(INDO_LAST_NAMES);
  const before = pickRandom(DOSEN_TITLES_BEFORE);
  const after = pickRandom(DOSEN_TITLES_AFTER);
  return `${before} ${first} ${last}, ${after}`;
}

function generateStudentName(isMale: boolean, index: number): string {
  // Gunakan index untuk meminimalkan tabrakan nama kembar
  const first = INDO_FIRST_NAMES[(index + (isMale ? 0 : 50)) % INDO_FIRST_NAMES.length];
  const last = INDO_LAST_NAMES[(index * 3) % INDO_LAST_NAMES.length];
  return `${first} ${last}`;
}

// Template Mata Kuliah berdasarkan rumpun keilmuan prodi
const COURSE_DOMAINS: Record<string, string[]> = {
  TI: [
    'Dasar Pemrograman',
    'Algoritma dan Struktur Data',
    'Pemrograman Berorientasi Objek',
    'Matematika Diskrit',
    'Arsitektur dan Organisasi Komputer',
    'Sistem Operasi',
    'Basis Data Relasional',
    'Jaringan Komputer',
    'Pemrograman Web Client-Side',
    'Pemrograman Web Server-Side',
    'Rekayasa Perangkat Lunak',
    'Interaksi Manusia dan Komputer',
    'Keamanan Perangkat Keras dan Lunak',
    'Sistem Terdistribusi',
    'Kecerdasan Buatan Dasar',
    'Machine Learning Praktis',
    'Pemrograman Aplikasi Mobile',
    'Cloud Computing Architecture',
    'Analisis dan Desain Algoritma',
    'Grafika Komputer dan Visualisasi',
    'Pengujian Perangkat Lunak',
    'Manajemen Proyek Perangkat Lunak',
    'Internet of Things (IoT)',
    'Tata Kelola Teknologi Informasi',
    'Pendidikan Pancasila',
    'Kewarganegaraan',
    'Bahasa Inggris Teknis',
    'Statistika dan Probabilitas',
    'Pendidikan Agama',
    'Kewirausahaan Teknologi (Technopreneurship)',
  ],
  SI: [
    'Pengantar Sistem Informasi',
    'Proses Bisnis Organisasi',
    'Analisis dan Perancangan Sistem',
    'Basis Data Perusahaan',
    'Algoritma Pemrograman untuk Bisnis',
    'Manajemen Infrastruktur TI',
    'Arsitektur Enterprise',
    'Sistem Informasi Manajemen',
    'Customer Relationship Management (CRM)',
    'Enterprise Resource Planning (ERP)',
    'Supply Chain Management (SCM)',
    'Analisis Data Bisnis',
    'Business Intelligence',
    'Audit dan Kontrol Sistem Informasi',
    'Keamanan Informasi Enterprise',
    'E-Business dan E-Commerce',
    'Manajemen Proyek Sistem Informasi',
    'Desain Pengalaman Pengguna (UX)',
    'Tata Kelola dan Audit Sistem Informasi',
    'Manajemen Risiko TI',
    'Pengembangan Sistem Informasi Cepat',
    'Sistem Pendukung Keputusan',
    'Etika dan Aspek Hukum TI',
    'Manajemen Pengetahuan (Knowledge Management)',
    'Pendidikan Pancasila',
    'Kewarganegaraan',
    'Bahasa Inggris Bisnis',
    'Statistika Bisnis',
    'Pendidikan Agama',
    'Kewirausahaan Sosial',
  ],
  MI: [
    'Aplikasi Perkantoran Lanjut',
    'Dasar Pemrograman Komputer',
    'Dasar-Dasar Basis Data',
    'Sistem Operasi Komputer',
    'Jaringan Komputer Praktis',
    'Desain Grafis dan Multimedia',
    'Pemrograman Web Dinamis',
    'Administrasi Basis Data',
    'Analisis Sistem Informasi Terapan',
    'Pemrograman Aplikasi Perkantoran',
    'Teknologi Informasi dan Komunikasi',
    'Komunikasi Data',
    'Praktikum Web Development',
    'Pemrograman Database Desktop',
    'E-Office and Collaboration Tools',
    'Keamanan Informasi Personal',
    'Troubleshooting Komputer dan Jaringan',
    'Sistem Informasi Akuntansi',
    'Manajemen Dokumen Digital',
    'Desain Web Responsif',
    'Pemrograman Visual Dasar',
    'Pengantar Multimedia Interaktif',
    'Etika Profesi IT',
    'Teknik Penulisan Laporan Teknis',
    'Pendidikan Pancasila',
    'Kewarganegaraan',
    'Bahasa Inggris Terapan',
    'Dasar Matematika Komputasi',
    'Pendidikan Agama',
    'Dasar Kewirausahaan',
  ],
};

function generate100Courses(prodiPrefix: string): { nama: string; kode: string }[] {
  const domains = COURSE_DOMAINS[prodiPrefix] || COURSE_DOMAINS['TI'];
  const list: { nama: string; kode: string }[] = [];

  // Buat 100 kombinasi unik
  let idx = 1;
  while (list.length < 100) {
    const domain = domains[(idx - 1) % domains.length];
    const suffixIdx = Math.ceil(idx / domains.length);
    let suffix = '';

    if (suffixIdx === 1) suffix = 'Dasar';
    else if (suffixIdx === 2) suffix = 'Lanjut';
    else if (suffixIdx === 3) suffix = 'Terapan';
    else if (suffixIdx === 4) suffix = 'Praktikum';
    else suffix = `Spesialisasi ${suffixIdx - 4}`;

    const nama = `${domain} ${suffix}`;
    const kode = `${prodiPrefix}-${String(idx).padStart(3, '0')}`;
    list.push({ nama, kode });
    idx++;
  }
  return list;
}

async function seed() {
  console.log('=== MEMULAI SEED DATA UJI COBA REALISTIS ===');

  const hashedPassword = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 10 });

  // 1. Seed Active Period (jika belum ada)
  const periodId = '20241';
  const existingPeriod = await db.query.periodeAkademik.findFirst({
    where: eq(periodeAkademik.id, periodId),
  });
  if (!existingPeriod) {
    await db.insert(periodeAkademik).values({
      id: periodId,
      nama: '2024/2025 Ganjil',
      aktif: true,
    });
    console.log(`- Periode Akademik ${periodId} berhasil dibuat.`);
  } else {
    console.log(`- Periode Akademik ${periodId} sudah ada.`);
  }

  // 2. Seed Users untuk masing-masing role
  const roles = ['admin', 'dosen', 'mahasiswa', 'prodi', 'keuangan', 'guest'] as const;
  for (const role of roles) {
    const email = `${role}.test@simak.id`;
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!existingUser) {
      await db.insert(users).values({
        email,
        password: hashedPassword,
        nama: `User Test ${role.toUpperCase()}`,
        role,
        isActive: true,
      });
      console.log(`- User dengan role ${role} (${email}) berhasil dibuat.`);
    } else {
      console.log(`- User dengan role ${role} (${email}) sudah ada.`);
    }
  }

  // 3. Seed 3 Prodi
  const PRODI_DATA = [
    { kode: 'TI-TEST', nama: 'D4 Teknik Informatika (Test)', jenjang: 'D4' },
    { kode: 'SI-TEST', nama: 'D4 Sistem Informasi (Test)', jenjang: 'D4' },
    { kode: 'MI-TEST', nama: 'D3 Manajemen Informatika (Test)', jenjang: 'D3' },
  ];

  const prodiIds: number[] = [];
  for (const p of PRODI_DATA) {
    let prodiRecord = await db.query.programStudi.findFirst({
      where: eq(programStudi.kode, p.kode),
    });
    if (!prodiRecord) {
      const [inserted] = await db.insert(programStudi).values(p).returning();
      prodiRecord = inserted;
      console.log(`- Prodi ${p.kode} berhasil dibuat.`);
    } else {
      console.log(`- Prodi ${p.kode} sudah ada.`);
    }
    prodiIds.push(prodiRecord.id);
  }

  // 4. Seed 10 Dosen di masing-masing prodi (Total 30 Dosen)
  for (let i = 0; i < prodiIds.length; i++) {
    const prodiId = prodiIds[i];
    const prodiKode = PRODI_DATA[i].kode;
    const prodiPrefix = prodiKode.split('-')[0]; // TI, SI, MI
    console.log(`- Seeding 10 dosen untuk Prodi ${prodiKode}...`);

    for (let d = 1; d <= 10; d++) {
      const isMale = d % 2 === 0;
      const nip = `NIP-${prodiPrefix}-${String(d).padStart(3, '0')}`;
      const email = `dosen.${prodiPrefix.toLowerCase()}.${d}@simak.id`;
      const nama = generateLecturerName(isMale);

      let dosenRecord = await db.query.dosen.findFirst({
        where: eq(dosen.nip, nip),
      });

      if (!dosenRecord) {
        const [inserted] = await db
          .insert(dosen)
          .values({
            nip,
            nama,
            email,
            programStudiId: prodiId,
            jenisKelamin: isMale ? 'L' : 'P',
            tanggalLahir: `19${randomInt(65, 85)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
          })
          .returning();
        dosenRecord = inserted;

        // Buat user untuk dosen agar bisa login
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!existingUser) {
          await db.insert(users).values({
            email,
            password: hashedPassword,
            nama,
            role: 'dosen',
            isActive: true,
          });
        }
      }
    }
  }

  // 5. Seed 100 Mahasiswa di masing-masing prodi (Total 300 Mahasiswa)
  for (let i = 0; i < prodiIds.length; i++) {
    const prodiId = prodiIds[i];
    const prodiKode = PRODI_DATA[i].kode;
    const prodiPrefix = prodiKode.split('-')[0]; // TI, SI, MI
    console.log(`- Seeding 100 mahasiswa untuk Prodi ${prodiKode}...`);

    // Dapatkan list dosen prodi ini untuk pembimbing akademik (PA)
    const prodiDosen = await db.query.dosen.findMany({
      where: eq(dosen.programStudiId, prodiId),
    });

    for (let m = 1; m <= 100; m++) {
      const isMale = m % 3 !== 0;
      const nim = `NIM-${prodiPrefix}-${String(m).padStart(3, '0')}`;
      const email = `mhs.${prodiPrefix.toLowerCase()}.${m}@simak.id`;
      const nama = generateStudentName(isMale, m);
      const dosenPa = prodiDosen.length > 0 ? pickRandom(prodiDosen) : null;

      const existingMhs = await db.query.mahasiswa.findFirst({
        where: eq(mahasiswa.nim, nim),
      });

      if (!existingMhs) {
        await db.insert(mahasiswa).values({
          nim,
          nama,
          email,
          angkatan: '2024',
          programStudiId: prodiId,
          dosenPaId: dosenPa?.id ?? null,
          status: 'aktif',
          namaIbuKandung: `Ibu ${nama.split(' ')[0]} ${pickRandom(INDO_LAST_NAMES)}`,
          nik: `3201${prodiId}${String(m).padStart(4, '0')}${randomInt(100000, 999999)}`.slice(0, 16),
          jenisKelamin: isMale ? 'L' : 'P',
          tanggalLahir: `2005-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
        });

        // Buat user untuk mahasiswa agar bisa login
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!existingUser) {
          await db.insert(users).values({
            email,
            password: hashedPassword,
            nama,
            role: 'mahasiswa',
            isActive: true,
          });
        }
      }
    }
  }

  // 6. Seed 100 Mata Kuliah di masing-masing kurikulum prodi (Total 300 Mata Kuliah)
  for (let i = 0; i < prodiIds.length; i++) {
    const prodiId = prodiIds[i];
    const prodiKode = PRODI_DATA[i].kode;
    const prodiPrefix = prodiKode.split('-')[0]; // TI, SI, MI
    console.log(`- Seeding Kurikulum & 100 Mata Kuliah untuk Prodi ${prodiKode}...`);

    // Buat kurikulum prodi
    const kurikulumKode = `KUR-${prodiPrefix}-2024`;
    let kurikulumRecord = await db.query.kurikulum.findFirst({
      where: eq(kurikulum.kode, kurikulumKode),
    });

    if (!kurikulumRecord) {
      const [inserted] = await db
        .insert(kurikulum)
        .values({
          kode: kurikulumKode,
          nama: `Kurikulum ${PRODI_DATA[i].nama} 2024`,
          programStudiId: prodiId,
          semesterMulai: periodId,
          jumlahSksLulus: 144,
          jumlahSksWajib: 120,
          jumlahSksPilihan: 24,
          isAktif: true,
        })
        .returning();
      kurikulumRecord = inserted;
    }

    // Generate 100 realistik mata kuliah
    const generatedCourses = generate100Courses(prodiPrefix);

    for (let mk = 0; mk < 100; mk++) {
      const course = generatedCourses[mk];
      const sks = randomInt(2, 4);

      let mkRecord = await db.query.mataKuliah.findFirst({
        where: eq(mataKuliah.kode, course.kode),
      });

      if (!mkRecord) {
        const [inserted] = await db
          .insert(mataKuliah)
          .values({
            programStudiId: prodiId,
            kode: course.kode,
            nama: course.nama,
            sksTotal: sks,
            sksTatapMuka: sks,
            sksPraktek: 0,
          })
          .returning();
        mkRecord = inserted;

        if (!mkRecord) continue;

        // Hubungkan mata kuliah ke kurikulum
        const existingRel = await db.query.kurikulumMataKuliah.findFirst({
          where: (km, { and, eq }) => and(eq(km.kurikulumId, kurikulumRecord.id), eq(km.mataKuliahId, mkRecord!.id)),
        });

        if (!existingRel) {
          await db.insert(kurikulumMataKuliah).values({
            kurikulumId: kurikulumRecord.id,
            mataKuliahId: mkRecord.id,
            semester: randomInt(1, 8),
            sksMataKuliah: sks,
            isWajib: true,
          });
        }
      }
    }
  }

  console.log('=== SEEDING SELESAI DENGAN SUKSES ===');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed gagal:', err);
  process.exit(1);
});
