import { db } from './utils/db';
import { krs, kelasKuliah, mahasiswa } from './models/schema';

async function main() {
  const krsList = await db.select().from(krs);
  console.log("=== KRS LIST ===");
  console.log(JSON.stringify(krsList, null, 2));

  const kelasList = await db.select().from(kelasKuliah);
  console.log("=== KELAS KULIAH ===");
  console.log(JSON.stringify(kelasList, null, 2));

  const mhsList = await db.select().from(mahasiswa);
  console.log("=== MAHASISWA ===");
  console.log(JSON.stringify(mhsList, null, 2));
}

main().catch(console.error);
