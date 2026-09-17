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

export interface NilaiEnvelope {
  min: number;
  max: number;
}

/**
 * Menentukan rentang nilai global yang berlaku dari aturan konversi nilai.
 * Skala ditentukan oleh nilai maksimum aturan: <= 10 berarti skala 0.00-10.00,
 * selain itu skala 0-100. Batas bawah selalu 0. Fallback ke 0-100 bila tidak
 * ada aturan valid.
 */
export function resolveNilaiEnvelope(rules: KonversiRule[]): NilaiEnvelope {
  let max = Number.NEGATIVE_INFINITY;

  for (const rule of rules) {
    const rMax = parseFloat(String(rule.nilaiMax));
    if (!Number.isFinite(rMax)) continue;
    if (rMax > max) max = rMax;
  }

  if (!Number.isFinite(max) || max <= 0) {
    return { min: 0, max: 100 };
  }
  return { min: 0, max: max <= 10 ? 10 : 100 };
}

export function isScoreInEnvelope(score: number, envelope: NilaiEnvelope): boolean {
  return Number.isFinite(score) && score >= envelope.min && score <= envelope.max;
}

function round2(value: number): number {
  return parseFloat(value.toFixed(2));
}

/**
 * Toleransi total bobot (dalam persen). Bobot desimal seperti 33.33 + 33.33 + 33.34
 * tidak pernah tepat 100 dalam floating-point; selisih < 0.01 diperlakukan lengkap.
 */
export const BOBOT_EPSILON = 0.01;

/** Total bobot dianggap lengkap bila |round2(100 - weight)| <= BOBOT_EPSILON. */
export function isBobotComplete(weight: number): boolean {
  return Math.abs(round2(100 - weight)) <= BOBOT_EPSILON;
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

  const complete = missing === 0 && isBobotComplete(weight);
  if (weight === 0) {
    return { score: null, complete: false };
  }
  return { score: round2(total), complete };
}

/**
 * Menghitung nilai akhir mata kuliah (NA) dari seluruh komponen.
 * Preseden: nilai langsung (override eksplisit) menang atas agregasi sub.
 * Komponen tanpa nilai langsung memakai hasil agregasi sub bila lengkap.
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

    const direct = directGrades.get(comp.id);
    const subResult = subs.length > 0 ? computeKomponenScore(subGrades, subs) : { score: null, complete: false };

    if (direct !== undefined) {
      // Override langsung menang; nilai sub tetap tersimpan di level bawah.
      score = direct;
      complete = true;
    } else if (subResult.complete && subResult.score !== null) {
      // Tidak ada override → pakai agregasi sub yang lengkap.
      score = subResult.score;
      complete = true;
    } else {
      score = subResult.score;
      complete = false;
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
    isComplete: isComplete && isBobotComplete(registeredWeight),
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
