export interface KomponenDef {
  id: number;
  bobot: number;
}

export interface SubKomponenDef {
  id: number;
  bobot: number;
}

export interface KomponenScoreResult {
  score: number | null;
  complete: boolean;
}

export interface FinalScoreResult {
  finalScore: number;
  registeredWeight: number;
  isComplete: boolean;
}

export interface KonversiRule {
  nilaiMin: number | string;
  nilaiMax: number | string;
  nilaiHuruf: string;
  bobotIndeks: number | string;
}

export interface GradeResult {
  huruf: string;
  indeks: number;
}

function round2(value: number): number {
  return parseFloat(value.toFixed(2));
}

/**
 * Menghitung nilai suatu komponen dari nilai sub-komponennya (weighted average).
 * Bobot sub relatif terhadap induk; dianggap lengkap jika seluruh sub terisi dan total bobot sub == 100.
 */
export function computeKomponenScore(subGrades: Map<number, number>, subDefs: SubKomponenDef[]): KomponenScoreResult {
  if (subDefs.length === 0) {
    return { score: null, complete: false };
  }

  let total = 0;
  let weight = 0;
  let missing = 0;

  for (const def of subDefs) {
    const value = subGrades.get(def.id);
    if (value === undefined) {
      missing += 1;
      continue;
    }
    total += value * (def.bobot / 100);
    weight += def.bobot;
  }

  const complete = missing === 0 && weight === 100;
  if (weight === 0) {
    return { score: null, complete: false };
  }
  return { score: round2(total), complete };
}

/**
 * Menghitung nilai akhir mata kuliah (NA) dari seluruh komponen.
 * Komponen yang memiliki sub memakai hasil agregasi sub; komponen tanpa sub memakai nilai langsung.
 */
export function buildFinalScore(
  components: KomponenDef[],
  subDefsByKomponen: Map<number, SubKomponenDef[]>,
  directGrades: Map<number, number>,
  subGrades: Map<number, number>,
): FinalScoreResult {
  let finalScore = 0;
  let registeredWeight = 0;
  let isComplete = true;

  for (const comp of components) {
    const subs = subDefsByKomponen.get(comp.id) ?? [];
    let score: number | null = null;
    let complete = false;

    if (subs.length > 0) {
      const result = computeKomponenScore(subGrades, subs);
      score = result.score;
      complete = result.complete;
    } else {
      const direct = directGrades.get(comp.id);
      score = direct ?? null;
      complete = direct !== undefined;
    }

    if (!complete || score === null) {
      isComplete = false;
      continue;
    }

    finalScore += score * (comp.bobot / 100);
    registeredWeight += comp.bobot;
  }

  return {
    finalScore: round2(finalScore),
    registeredWeight,
    isComplete: isComplete && registeredWeight === 100,
  };
}

/**
 * Menentukan huruf mutu & bobot indeks dari aturan konversi, dengan fallback statis.
 */
export function resolveGradeFromRules(rules: KonversiRule[], score: number): GradeResult {
  for (const rule of rules) {
    const min = parseFloat(String(rule.nilaiMin));
    const max = parseFloat(String(rule.nilaiMax));
    if (score >= min && score <= max) {
      return { huruf: rule.nilaiHuruf, indeks: parseFloat(String(rule.bobotIndeks)) };
    }
  }

  if (score >= 80) return { huruf: 'A', indeks: 4.0 };
  if (score >= 75) return { huruf: 'B+', indeks: 3.5 };
  if (score >= 70) return { huruf: 'B', indeks: 3.0 };
  if (score >= 65) return { huruf: 'C+', indeks: 2.5 };
  if (score >= 60) return { huruf: 'C', indeks: 2.0 };
  if (score >= 50) return { huruf: 'D', indeks: 1.0 };
  return { huruf: 'E', indeks: 0.0 };
}
