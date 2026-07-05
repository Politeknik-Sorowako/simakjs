import { app } from './app';
import { cpmk, dosen, kelasKuliah } from './models/schema';
import { db } from './utils/db';

async function run() {
  // 1. Reset Database
  const resReset = await app.handle(
    new Request('http://localhost/e2e/reset', {
      method: 'POST',
    }),
  );
  console.log('Reset status:', resReset.status);

  // 2. Fetch all data
  const classes = await db.select().from(kelasKuliah);
  console.log('Kelas Kuliah in DB:', classes);

  const cpmks = await db.select().from(cpmk);
  console.log('CPMK in DB:', cpmks);

  const dosens = await db.select().from(dosen);
  console.log('Dosen in DB:', dosens);
}

run().catch(console.error);
