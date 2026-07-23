import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { kurikulumController } from '../controllers/kurikulumController';
import { obeReportController } from '../controllers/obeReportController';
import { prodiController } from '../controllers/prodiController';

export default function LaporanObe() {
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);
  const [kurikulumFilter, setKurikulumFilter] = createSignal<number | undefined>(undefined);

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [kurikulums] = createResource(
    () => prodiFilter(),
    async (prodiId) => {
      if (!prodiId) return [];
      const res = await kurikulumController.getAll('', 1, 100, prodiId);
      return res.data;
    },
  );

  const [summary] = createResource(
    () => prodiFilter(),
    async (prodiId) => {
      if (!prodiId) return null;
      return obeReportController.getSummary(prodiId);
    },
  );

  const [cplCpmkCoverage] = createResource(
    () => kurikulumFilter(),
    async (kurikulumId) => {
      if (!kurikulumId) return null;
      return obeReportController.getCplCpmkCoverage(kurikulumId);
    },
  );

  const [bkMkCoverage] = createResource(
    () => kurikulumFilter(),
    async (kurikulumId) => {
      if (!kurikulumId) return null;
      return obeReportController.getBkMkCoverage(kurikulumId);
    },
  );

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-white">Laporan OBE</h1>
        </div>

        <div class="flex gap-4 items-center flex-wrap">
          <div class="w-64">
            <Input
              type="select"
              placeholder="Program Studi"
              value={prodiFilter() ?? ''}
              onInput={(e) => {
                const val = e.currentTarget.value;
                setProdiFilter(val ? Number(val) : undefined);
                setKurikulumFilter(undefined);
              }}
              isSelect
              selectOptions={[
                { value: '', label: 'Pilih Program Studi' },
                ...(prodis()?.data?.map((p) => ({ value: String(p.id), label: `${p.kode} - ${p.nama}` })) || []),
              ]}
            />
          </div>
          <Show when={prodiFilter()}>
            <div class="w-64">
              <Input
                type="select"
                placeholder="Kurikulum"
                value={kurikulumFilter() ?? ''}
                onInput={(e) => setKurikulumFilter(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
                isSelect
                selectOptions={[
                  { value: '', label: 'Pilih Kurikulum' },
                  ...(kurikulums()?.map((k) => ({ value: String(k.id), label: k.nama })) || []),
                ]}
              />
            </div>
          </Show>
        </div>

        {/* Summary Cards */}
        <Show when={summary()} keyed>
          {(data) => (
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="bordered" padding="lg">
                <div class="text-sm text-secondary-400 mb-1">Profil Lulusan</div>
                <div class="text-3xl font-bold text-white">{data.profilLulusan}</div>
              </Card>
              <Card variant="bordered" padding="lg">
                <div class="text-sm text-secondary-400 mb-1">CPL</div>
                <div class="text-3xl font-bold text-white">{data.cpl}</div>
                <div class="text-xs text-secondary-400 mt-1">{data.plCplMappings} mapping ke PL</div>
              </Card>
              <Card variant="bordered" padding="lg">
                <div class="text-sm text-secondary-400 mb-1">Bahan Kajian</div>
                <div class="text-3xl font-bold text-white">{data.bahanKajian}</div>
                <div class="text-xs text-secondary-400 mt-1">{data.bkCplMappings} mapping ke CPL</div>
              </Card>
            </div>
          )}
        </Show>

        {/* CPL-CPMK Coverage */}
        <Show when={cplCpmkCoverage()} keyed>
          {(data) => (
            <Card variant="bordered" padding="lg">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-white">Cakupan CPL oleh CPMK</h2>
                <Badge
                  variant={data.coveragePercent >= 80 ? 'success' : data.coveragePercent >= 50 ? 'warning' : 'danger'}
                >
                  {data.coveragePercent.toFixed(1)}% tercakup
                </Badge>
              </div>
              <div class="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div class="text-sm text-secondary-400">Total CPL</div>
                  <div class="text-2xl font-bold text-white">{data.totalCpl}</div>
                </div>
                <div>
                  <div class="text-sm text-secondary-400">Tercakup</div>
                  <div class="text-2xl font-bold text-emerald-400">{data.coveredCpl}</div>
                </div>
                <div>
                  <div class="text-sm text-secondary-400">Belum Tercakup</div>
                  <div class="text-2xl font-bold text-red-400">{data.uncoveredCpl}</div>
                </div>
              </div>
              <Show when={data.uncovered.length > 0}>
                <div class="border-t border-slate-700 pt-4">
                  <h4 class="text-sm font-medium text-secondary-200 mb-2">CPL yang belum dicakup CPMK:</h4>
                  <div class="space-y-2">
                    <For each={data.uncovered}>
                      {(cpl: { kode: string; deskripsi: string }) => (
                        <div class="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg">
                          <span class="text-red-400 font-mono text-sm">{cpl.kode}</span>
                          <span class="text-secondary-200 text-sm">{cpl.deskripsi}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </Card>
          )}
        </Show>

        {/* BK-MK Coverage */}
        <Show when={bkMkCoverage()} keyed>
          {(data) => (
            <Card variant="bordered" padding="lg">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-white">Cakupan Bahan Kajian oleh Mata Kuliah</h2>
                <Badge
                  variant={data.coveragePercent >= 80 ? 'success' : data.coveragePercent >= 50 ? 'warning' : 'danger'}
                >
                  {data.coveragePercent.toFixed(1)}% tercakup
                </Badge>
              </div>
              <div class="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div class="text-sm text-secondary-400">Total BK</div>
                  <div class="text-2xl font-bold text-white">{data.totalBk}</div>
                </div>
                <div>
                  <div class="text-sm text-secondary-400">Tercakup</div>
                  <div class="text-2xl font-bold text-emerald-400">{data.coveredBk}</div>
                </div>
                <div>
                  <div class="text-sm text-secondary-400">Belum Tercakup</div>
                  <div class="text-2xl font-bold text-red-400">{data.uncoveredBk}</div>
                </div>
              </div>
              <Show when={data.uncovered.length > 0}>
                <div class="border-t border-slate-700 pt-4">
                  <h4 class="text-sm font-medium text-secondary-200 mb-2">BK yang belum diturunkan ke MK:</h4>
                  <div class="space-y-2">
                    <For each={data.uncovered}>
                      {(bk: { kode: string; nama: string }) => (
                        <div class="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg">
                          <span class="text-red-400 font-mono text-sm">{bk.kode}</span>
                          <span class="text-secondary-200 text-sm">{bk.nama}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </Card>
          )}
        </Show>

        <Show when={!prodiFilter()}>
          <div class="text-center py-12 text-secondary-400">Pilih program studi untuk melihat laporan OBE</div>
        </Show>
      </div>
    </MainLayout>
  );
}
