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
}
