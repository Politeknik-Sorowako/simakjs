import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ChangelogItem {
  text: string;
  children: string[];
}

export interface ChangelogGroup {
  heading: string;
  items: ChangelogItem[];
}

export interface ChangelogSection {
  version: string;
  date: string | null;
  groups: ChangelogGroup[];
}

const SECTION_RE = /^##\s+\[([^\]]+)\](?:\s*-\s*(.*))?$/;
const GROUP_RE = /^###\s+(.+)$/;
const ITEM_RE = /^[-*]\s+(.+)$/;
const SUB_ITEM_RE = /^\s+[-*]\s+(.+)$/;

const CACHE_TTL_MS = 5 * 60 * 1000;

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

let cachedSections: ChangelogSection[] | null = null;
let cachedAt = 0;

export class ChangelogService {
  static getSections(): ChangelogSection[] {
    const now = Date.now();
    if (cachedSections && now - cachedAt < CACHE_TTL_MS) {
      return cachedSections;
    }

    const path = findChangelogPath();
    let sections: ChangelogSection[] = [];
    if (path) {
      let raw: string;
      try {
        raw = readFileSync(path, 'utf8');
      } catch {
        raw = '';
      }
      sections = ChangelogService.parse(raw);
    }

    cachedSections = sections;
    cachedAt = now;
    return sections;
  }

  static parse(raw: string): ChangelogSection[] {
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
        currentGroup.items.push({ text: itemMatch[1].trim(), children: [] });
        continue;
      }

      const subItemMatch = line.match(SUB_ITEM_RE);
      if (subItemMatch && currentGroup && currentGroup.items.length > 0) {
        const lastItem = currentGroup.items[currentGroup.items.length - 1];
        lastItem.children.push(subItemMatch[1].trim());
      }
    }
    if (current) sections.push(current);

    return sections;
  }
}
