#!/usr/bin/env node
/**
 * Generate version.json from the root package.json "version" + git commit hash
 * + build timestamp, and write it into apps/frontend/public/version.json so the
 * About page can read a single source of truth.
 */
const { execSync } = require('node:child_process');
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const pkgPath = join(root, 'package.json');

function gitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function buildNumber() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${pad(d.getHours())}${pad(d.getMinutes())}`;
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const environment = process.env.VITE_APP_ENV || process.env.NODE_ENV || 'development';

const version = {
  name: pkg.name || 'simak-vokasi',
  version: pkg.version || '0.0.0',
  buildNumber: pkg.buildNumber || buildNumber(),
  gitCommitHash: gitHash(),
  environment,
  lastUpdated: new Date().toISOString(),
  source: 'package.json',
};

const outDir = join(root, 'apps', 'frontend', 'public');
const outPath = join(outDir, 'version.json');
if (!existsSync(outDir)) {
  // base it on existing built output if present, otherwise root
  writeFileSync(join(root, 'version.json'), JSON.stringify(version, null, 2) + '\n');
  process.stdout.write(`[version] wrote ${join(root, 'version.json')}\n`);
} else {
  writeFileSync(outPath, JSON.stringify(version, null, 2) + '\n');
  process.stdout.write(`[version] wrote ${outPath}\n`);
}