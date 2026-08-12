import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ChangelogGroup {
  heading: string;
  items: string[];
}

export interface ChangelogSection {
  version: string;
  date: string | null;
  groups: ChangelogGroup[];
}

const SECTION_RE = /^##\s+\[([^\]]+)\](?:\s*-\s*(.*))?$/;
const GROUP_RE = /^###\s+(.+)$/;
const ITEM_RE = /^[-*]\s+(.+)$/;

function findChangelogPath(): string | null {
  const candidates = [
    join(process.cwd(), '..', 'CHANGELOG.md'),
    join(process.cwd(), 'CHANGELOG.md'),
    join(process.cwd(), '..', '..', 'CHANGELOG.md'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

export class ChangelogService {
  static getSections(): ChangelogSection[] {
    const path = findChangelogPath();
    if (!path) return [];

    let raw: string;
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      return [];
    }

    const lines = raw.split(/\r?\n/);
    const sections: ChangelogSection[] = [];
    let current: ChangelogSection | null = null;
    let currentGroup: ChangelogGroup | null = null;

    for (const line of lines) {
      const sectionMatch = line.match(SECTION_RE);
      if (sectionMatch) {
        if (current) sections.push(current);
        current = {
          version: sectionMatch[1],
          date: sectionMatch[2]?.trim() || null,
          groups: [],
        };
        currentGroup = null;
        continue;
      }

      const groupMatch = line.match(GROUP_RE);
      if (groupMatch && current) {
        currentGroup = { heading: groupMatch[1].trim(), items: [] };
        current.groups.push(currentGroup);
        continue;
      }

      const itemMatch = line.match(ITEM_RE);
      if (itemMatch && current) {
        if (!currentGroup) {
          currentGroup = { heading: 'Umum', items: [] };
          current.groups.push(currentGroup);
        }
        currentGroup.items.push(itemMatch[1].trim());
      }
    }
    if (current) sections.push(current);

    return sections;
  }
}
