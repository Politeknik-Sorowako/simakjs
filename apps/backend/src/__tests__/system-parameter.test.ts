import { describe, expect, it } from 'bun:test';
import { SystemParameterService } from '../services/system-parameter.service';

describe('SystemParameterService — Toggle Blocking KHS & KRS', () => {
  it('default parameter: KHS diblokir (true), KRS tidak diblokir (false)', () => {
    const defaults = SystemParameterService.defaults();
    expect(defaults.BLOCK_KHS_JIKA_TANGGUNGAN.value).toBe('true');
    expect(defaults.BLOCK_KHS_JIKA_TANGGUNGAN.type).toBe('boolean');
    expect(defaults.BLOCK_KRS_JIKA_TANGGUNGAN.value).toBe('false');
    expect(defaults.BLOCK_KRS_JIKA_TANGGUNGAN.type).toBe('boolean');
  });

  it('nilai tersimpan menang atas default dan helper membaca nilainya', async () => {
    await SystemParameterService.set('BLOCK_KHS_JIKA_TANGGUNGAN', 'false');
    expect(await SystemParameterService.isKhsBlockEnabled()).toBe(false);

    await SystemParameterService.set('BLOCK_KHS_JIKA_TANGGUNGAN', 'true');
    expect(await SystemParameterService.isKhsBlockEnabled()).toBe(true);

    await SystemParameterService.set('BLOCK_KRS_JIKA_TANGGUNGAN', 'true');
    expect(await SystemParameterService.isKrsBlockEnabled()).toBe(true);

    await SystemParameterService.set('BLOCK_KRS_JIKA_TANGGUNGAN', 'false');
    expect(await SystemParameterService.isKrsBlockEnabled()).toBe(false);
  });
});
