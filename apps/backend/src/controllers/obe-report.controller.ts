import { ObeReportService } from '../services/obe-report.service';
import { AuthContext } from '../utils/types';

export class ObeReportController {
  static async getCplCpmkCoverage({ query, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const kurikulumId = parseInt(query.kurikulumId);
    if (!kurikulumId) {
      return { error: 'kurikulumId diperlukan' };
    }
    try {
      return await ObeReportService.getCplCpmkCoverage(kurikulumId);
    } catch (e: any) {
      return { error: e.message };
    }
  }

  static async getBkMkCoverage({ query, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const kurikulumId = parseInt(query.kurikulumId);
    if (!kurikulumId) {
      return { error: 'kurikulumId diperlukan' };
    }
    try {
      return await ObeReportService.getBkMkCoverage(kurikulumId);
    } catch (e: any) {
      return { error: e.message };
    }
  }

  static async getObeSummary({ query, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const prodiId = parseInt(query.prodiId);
    if (!prodiId) {
      return { error: 'prodiId diperlukan' };
    }
    try {
      return await ObeReportService.getObeSummary(prodiId);
    } catch (e: any) {
      return { error: e.message };
    }
  }

  static async getCpmkAchievement({ params, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const kelasKuliahId = parseInt(params.kelasKuliahId);
    try {
      return await ObeReportService.getCpmkAchievement(kelasKuliahId);
    } catch (e: any) {
      return { error: e.message };
    }
  }

  static async getCplAchievement({ query, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const kurikulumId = query.kurikulumId ? parseInt(query.kurikulumId) : undefined;
    const periodeId = query.periodeId || undefined;
    try {
      return await ObeReportService.getCplAchievement(kurikulumId, periodeId);
    } catch (e: any) {
      return { error: e.message };
    }
  }

  static async getEvaluasiRekap({ params, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const kurikulumId = parseInt(params.kurikulumId);
    try {
      return await ObeReportService.getEvaluasiRekap(kurikulumId);
    } catch (e: any) {
      return { error: e.message };
    }
  }
}
