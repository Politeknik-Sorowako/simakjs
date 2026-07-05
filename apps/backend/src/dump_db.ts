import { kelasKuliah, krs, mahasiswa } from './models/schema';
import { db } from './utils/db';

async function main() {
  const krsList = await db.select().from(krs);
  console.log('=== KRS LIST ===');
  console.log(JSON.stringify(krsList, null, 2));

  const kelasList = await db.select().from(kelasKuliah);
  console.log('=== KELAS KULIAH ===');
  console.log(JSON.stringify(kelasList, null, 2));

  const mhsList = await db.select().from(mahasiswa);
  console.log('=== MAHASISWA ===');
  console.log(JSON.stringify(mhsList, null, 2));
}

main().catch(console.error);
