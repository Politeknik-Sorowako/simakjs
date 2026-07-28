import { ObeReportService } from '../services/obe-report.service';
import { AuthContext } from '../utils/types';

export class ObeReportController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getCplCpmkCoverage({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const kurikulumId = parseInt(query.kurikulumId);
    if (!kurikulumId) {
      return { error: 'kurikulumId diperlukan' };
    }
    try {
      return await ObeReportService.getCplCpmkCoverage(kurikulumId);
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getBkMkCoverage({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const kurikulumId = parseInt(query.kurikulumId);
    if (!kurikulumId) {
      return { error: 'kurikulumId diperlukan' };
    }
    try {
      return await ObeReportService.getBkMkCoverage(kurikulumId);
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getObeSummary({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const prodiId = parseInt(query.prodiId);
    if (!prodiId) {
      return { error: 'prodiId diperlukan' };
    }
    try {
      return await ObeReportService.getObeSummary(prodiId);
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getCpmkAchievement({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const kelasKuliahId = parseInt(params.kelasKuliahId);
    try {
      return await ObeReportService.getCpmkAchievement(kelasKuliahId);
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getCplAchievement({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const kurikulumId = query.kurikulumId ? parseInt(query.kurikulumId) : undefined;
    const periodeId = query.periodeId || undefined;
    try {
      return await ObeReportService.getCplAchievement(kurikulumId, periodeId);
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getEvaluasiRekap({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const kurikulumId = parseInt(params.kurikulumId);
    try {
      return await ObeReportService.getEvaluasiRekap(kurikulumId);
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }
}
