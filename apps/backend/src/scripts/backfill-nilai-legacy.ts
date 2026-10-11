import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { programStudi } from '../models/schema';
import { CsvImportService, type ImportResult } from '../services/csv-import.service';
import { db } from '../utils/db';

interface CliArgs {
  pribadi?: string;
  kodemk?: string;
  nilai?: string;
  periodeId?: string;
  prodiKode?: string;
  prodiMap?: string;
  namaKelas: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { namaKelas: 'LEGACY' };
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const [key, ...rest] = raw.slice(2).split('=');
    const value = rest.join('=');
    switch (key) {
      case 'pribadi':
        args.pribadi = value;
        break;
      case 'kodemk':
        args.kodemk = value;
        break;
      case 'nilai':
        args.nilai = value;
        break;
      case 'periodeId':
        args.periodeId = value;
        break;
      case 'prodiKode':
        args.prodiKode = value;
        break;
      case 'prodiMap':
        args.prodiMap = value;
        break;
      case 'namaKelas':
        args.namaKelas = value || 'LEGACY';
        break;
      default:
        break;
    }
  }
  return args;
}

async function loadText(path: string): Promise<string> {
  return readFile(resolve(path), 'utf8');
}

async function resolveProgramStudiId(prodiKode: string): Promise<number> {
  const [found] = await db
    .select({ id: programStudi.id })
    .from(programStudi)
    .where(eq(programStudi.kode, prodiKode))
    .limit(1);
  if (!found) {
    throw new Error(`Program studi dengan kode "${prodiKode}" tidak ditemukan.`);
  }
  return found.id;
}

async function report(label: string, filePath: string, result: ImportResult): Promise<void> {
  console.log(`\n[${label}] ${basename(filePath)}`);
  console.log(`  sukses=${result.successCount} dilewati=${result.skippedCount} error=${result.errors.length}`);
  for (const err of result.errors.slice(0, 50)) {
    console.warn(`  baris ${err.line}: ${err.error}`);
  }
  if (result.errors.length > 50) {
    console.warn(`  ... dan ${result.errors.length - 50} error lainnya (lihat berkas hasil).`);
  }
  const outPath = `${filePath.replace(/\.[^.]+$/, '')}.result.json`;
  await writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`  hasil lengkap: ${outPath}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.nilai && !args.pribadi && !args.kodemk) {
    console.error(
      'Penggunaan: bun run src/scripts/backfill-nilai-legacy.ts --nilai=<DAFTARNILAI.csv> --periodeId=20241\n' +
        '  Opsional: --pribadi=<PRIBADI.csv> --prodiMap=<map.json> --kodemk=<KODEMK.csv> --prodiKode=PM --namaKelas=LEGACY',
    );
    process.exit(1);
  }

  if (args.pribadi) {
    if (!args.prodiMap) {
      console.error('--prodiMap wajib disertakan bila --pribadi digunakan.');
      process.exit(1);
    }
    const mapRaw = await loadText(args.prodiMap);
    const prodiMapByName = JSON.parse(mapRaw) as Record<string, string>;
    const text = await loadText(args.pribadi);
    await report('MAHASISWA', args.pribadi, await CsvImportService.importMahasiswaLegacy(text, prodiMapByName));
  }

  if (args.kodemk) {
    if (!args.prodiKode) {
      console.error('--prodiKode wajib disertakan bila --kodemk digunakan.');
      process.exit(1);
    }
    const programStudiId = await resolveProgramStudiId(args.prodiKode);
    const text = await loadText(args.kodemk);
    await report('MATA KULIAH', args.kodemk, await CsvImportService.importMataKuliahLegacy(text, programStudiId));
  }

  if (args.nilai) {
    if (!args.periodeId) {
      console.error('--periodeId wajib disertakan bila --nilai digunakan.');
      process.exit(1);
    }
    const text = await loadText(args.nilai);
    await report(
      'NILAI LEGACY',
      args.nilai,
      await CsvImportService.importNilaiLegacy(text, args.periodeId, { namaKelas: args.namaKelas }),
    );
  }

  console.log('\nSelesai.');
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : 'Unknown error');
  process.exit(1);
});
