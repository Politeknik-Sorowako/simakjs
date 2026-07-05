import { periodeAkademik } from './models/schema';
import { db } from './utils/db';

async function main() {
  const list = await db.select().from(periodeAkademik);
  console.log('=== PERIODE AKADEMIK ===');
  console.log(JSON.stringify(list, null, 2));
}

main().catch(console.error);
