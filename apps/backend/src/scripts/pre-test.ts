const result = Bun.spawnSync(['bunx', 'drizzle-kit', 'push'], {
  env: { ...process.env },
  stdio: ['inherit', 'pipe', 'pipe'],
});

const stdout = result.stdout?.toString() || '';
const stderr = result.stderr?.toString() || '';
const output = stdout + stderr;

if (result.exitCode === 0) {
  console.log('[PRE-TEST] drizzle-kit push succeeded.');
  process.exit(0);
}

if (output.includes('already exists')) {
  console.log('[PRE-TEST] drizzle-kit push failed due to existing enums. Running ensure-enums fallback...');
  const enumResult = Bun.spawnSync(['bun', 'run', 'src/scripts/ensure-enums.ts'], {
    env: { ...process.env },
    stdio: 'inherit',
  });
  if (enumResult.exitCode === 0) {
    console.log('[PRE-TEST] ensure-enums completed. Continuing with tests...');
    process.exit(0);
  }
  console.error('[PRE-TEST] ensure-enums also failed.');
}

console.error('[PRE-TEST] drizzle-kit push output:', output);
console.error('[PRE-TEST] drizzle-kit push failed with exit code:', result.exitCode);
process.exit(result.exitCode || 1);
