import { db } from './utils/db';
import { periodeAkademik } from './models/schema';

async function main() {
  const list = await db.select().from(periodeAkademik);
  console.log("=== PERIODE AKADEMIK ===");
  console.log(JSON.stringify(list, null, 2));
}

main().catch(console.error);
