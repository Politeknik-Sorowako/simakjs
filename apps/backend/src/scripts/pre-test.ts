const enumResult = Bun.spawnSync(['bun', 'run', 'src/scripts/ensure-enums.ts'], {
  env: { ...process.env },
  stdio: ['inherit', 'inherit', 'inherit'],
});

if (enumResult.exitCode !== 0) {
  console.error('[PRE-TEST] ensure-enums failed.');
  process.exit(enumResult.exitCode);
}

console.log('[PRE-TEST] Enums verified. Skipping drizzle-kit push to avoid enum ordering conflicts.');
process.exit(0);
