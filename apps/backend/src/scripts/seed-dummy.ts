import { dosen, mahasiswa, programStudi, users } from '../models/schema';
import { db } from '../utils/db';

const DATA_PRODI = [
  { kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' },
  { kode: 'SI', nama: 'Sistem Informasi', jenjang: 'D4' },
  { kode: 'MI', nama: 'Manajemen Informatika', jenjang: 'D3' },
];

const ANGKATAN = ['2024', '2023', '2022'];
const DOSEN_NAMES = [
  'Dr. Ahmad Fauzi',
  'Dr. Siti Rahmawati',
  'Dr. Bambang Wijaya',
  'Dr. Dewi Sartika',
  'Dr. Agus Prasetyo',
  'Dr. Rina Marlina',
  'Dr. Hendra Gunawan',
  'Dr. Fitri Handayani',
  'Dr. Indra Lesmana',
  'Dr. Nia Kurniasih',
  'Dr. Teguh Purnomo',
  'Dr. Maya Anggraini',
  'Dr. Adi Nugroho',
  'Dr. Lina Safitri',
  'Dr. Rudi Hartono',
  'Dr. Yuni Astuti',
  'Dr. Eko Purnomo',
  'Dr. Ratna Dewi',
  'Dr. Dwi Cahyono',
  'Dr. Sri Wahyuni',
  'Dr. Irfan Maulana',
  'Dr. Wulan Sari',
  'Dr. Arif Budiman',
  'Dr. Dian Permata',
  'Dr. Ricky Setiawan',
  'Dr. Nina Wulandari',
  'Dr. Faisal Rahman',
  'Dr. Mira Susanti',
  'Dr. Galih Saputra',
  'Dr. Tari Puspadewi',
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNim(tahun: string, prodiIndex: number, urutan: number): string {
  return `${tahun}${String(prodiIndex + 1).padStart(2, '0')}${String(urutan).padStart(4, '0')}`;
}

async function seed() {
  console.log('Memulai seeding data dummy...');

  const hashedPassword = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 10 });

  const existingAdmin = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, 'admin@simak.id') });
  if (!existingAdmin) {
    await db.insert(users).values({
      email: 'admin@simak.id',
      password: hashedPassword,
      nama: 'Admin SIMAK',
      role: 'admin',
      isActive: true,
    });
    console.log('  Admin user created');
  }

  const createdProdi: typeof DATA_PRODI = [];
  for (const p of DATA_PRODI) {
    const existing = await db.query.programStudi.findFirst({ where: (ps, { eq }) => eq(ps.kode, p.kode) });
    if (!existing) {
      const [prodi] = await db.insert(programStudi).values(p).returning();
      createdProdi.push(p);
      console.log(`  Prodi: ${p.kode} - ${p.nama}`);
    } else {
      createdProdi.push(p);
      console.log(`  Prodi: ${p.kode} - ${p.nama} (already exists)`);
    }
  }

  const prodiList = await db.query.programStudi.findMany({ orderBy: (ps, { asc }) => asc(ps.id) });

  let dosenCount = 0;
  for (let i = 0; i < DOSEN_NAMES.length; i++) {
    const prodi = prodiList[i % prodiList.length];
    const nip = `19${String(randomInt(70, 99)).padStart(2, '0')}${String(randomInt(1, 12)).padStart(2, '0')}${String(randomInt(1, 28)).padStart(2, '0')}${String(randomInt(1000, 9999))}`;
    const email = `dosen${i + 1}@simak.id`;

    const existing = await db.query.dosen.findFirst({ where: (d, { eq }) => eq(d.email, email) });
    if (!existing) {
      await db.insert(dosen).values({
        nip,
        nama: DOSEN_NAMES[i],
        email,
        programStudiId: prodi.id,
        jenisKelamin: i % 2 === 0 ? 'L' : 'P',
        tanggalLahir: `${randomInt(1970, 1985)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
      });
      dosenCount++;

      const [dosenUser] = await db
        .select()
        .from(users)
        .where((u, { eq }) => eq(u.email, email));
      if (!dosenUser) {
        await db
          .insert(users)
          .values({ email, password: hashedPassword, nama: DOSEN_NAMES[i], role: 'dosen', isActive: true });
      }
    }
  }
  console.log(`  Created ${dosenCount} dosen`);

  const dosenList = await db.query.dosen.findMany();

  let mhsCount = 0;
  for (let pi = 0; pi < prodiList.length; pi++) {
    const prodi = prodiList[pi];
    const prodiDosen = dosenList.filter((d) => d.programStudiId === prodi.id);
    const mhsPerAngkatan = Math.ceil(100 / ANGKATAN.length);

    let urutan = 1;
    for (const angkatan of ANGKATAN) {
      const count =
        angkatan === ANGKATAN[ANGKATAN.length - 1] ? 100 - mhsPerAngkatan * (ANGKATAN.length - 1) : mhsPerAngkatan;

      for (let m = 0; m < count; m++) {
        const nim = generateNim(angkatan, pi, urutan);
        const email = `mhs${nim}@simak.id`;
        const nama = `Mahasiswa ${angkatan} Prodi ${prodi.kode} #${urutan}`;
        const dosenPa = prodiDosen.length > 0 ? pickRandom(prodiDosen) : null;

        const existing = await db.query.mahasiswa.findFirst({ where: (mhs, { eq }) => eq(mhs.email, email) });
        if (!existing) {
          await db.insert(mahasiswa).values({
            nim,
            nama,
            email,
            angkatan,
            programStudiId: prodi.id,
            dosenPaId: dosenPa?.id ?? null,
            status: 'aktif',
            namaIbuKandung: `Ibu dari ${nama}`,
            nik: `${String(pi + 1).padStart(2, '0')}${angkatan}${String(urutan).padStart(6, '0')}`,
            jenisKelamin: m % 2 === 0 ? 'L' : 'P',
            tanggalLahir: `${randomInt(2000, 2006)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
          });
          mhsCount++;

          if (m % 50 === 0) {
            await db.insert(users).values({ email, password: hashedPassword, nama, role: 'mahasiswa', isActive: true });
          }
        }
        urutan++;
      }
    }
  }
  console.log(`  Created ${mhsCount} mahasiswa`);

  console.log('Seeding selesai!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed gagal:', err);
  process.exit(1);
});
