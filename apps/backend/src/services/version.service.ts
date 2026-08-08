import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface VersionInfo {
  version: string;
  buildNumber: string;
  gitCommitHash: string | null;
  environment: string;
  lastUpdated: string;
  name?: string;
}

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version?: string };
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function readGitHash(): string | null {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export class VersionService {
  static getVersionInfo(envName?: string): VersionInfo {
    const version = readPackageVersion();
    const environment = envName || process.env.VITE_APP_ENV || process.env.NODE_ENV || 'development';
    const lastUpdated = new Date().toISOString();

    let buildNumber = `${nowStamp()}.${environment}`;
    let gitCommitHash: string | null = null;
    try {
      const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
        buildNumber?: string;
      };
      if (pkg.buildNumber) buildNumber = pkg.buildNumber;
    } catch {
      // ignore
    }
    gitCommitHash = readGitHash();

    return { version, buildNumber, gitCommitHash, environment, lastUpdated };
  }

  static readFromFile(envName?: string): VersionInfo {
    const paths = [join(process.cwd(), 'public', 'version.json'), join(process.cwd(), 'version.json')];
    for (const p of paths) {
      if (existsSync(p)) {
        try {
          const raw = JSON.parse(readFileSync(p, 'utf8')) as Partial<VersionInfo>;
          return {
            version: raw.version || readPackageVersion(),
            buildNumber: raw.buildNumber || '',
            gitCommitHash: raw.gitCommitHash || null,
            environment: raw.environment || envName || 'production',
            lastUpdated: raw.lastUpdated || new Date().toISOString(),
            source: ('source' in raw ? raw.source : undefined) || (raw.version ? 'file' : 'package'),
          } as VersionInfo;
        } catch {
          // fall through
        }
      }
    }
    return VersionService.getVersionInfo(envName);
  }
}
