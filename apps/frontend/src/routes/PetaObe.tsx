import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { bahanKajianController } from '../controllers/bahanKajianController';
import { cplController } from '../controllers/cplController';
import { cpmkCplMappingController } from '../controllers/cpmkCplMappingController';
import { kurikulumController } from '../controllers/kurikulumController';
import { prodiController } from '../controllers/prodiController';

export default function PetaObe() {
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);
  const [kurikulumFilter, setKurikulumFilter] = createSignal<number | undefined>(undefined);
  const [activeTab, setActiveTab] = createSignal<'pl-cpl' | 'bk-cpl' | 'cpmk-cpl'>('pl-cpl');

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [kurikulums] = createResource(
    () => prodiFilter(),
    async (prodiId) => {
      const res = await kurikulumController.getAll('', 1, 100, prodiId);
      return res.data;
    },
  );

  const [matriksPlCpl] = createResource(
    () => ({ prodiId: prodiFilter(), active: activeTab() === 'pl-cpl' }),
    async ({ prodiId }) => {
      if (!prodiId) return null;
      return cplController.getMatriks(prodiId);
    },
  );

  const [matriksCpmkCpl] = createResource(
    () => ({ kurikulumId: kurikulumFilter(), active: activeTab() === 'cpmk-cpl' }),
    async ({ kurikulumId }) => {
      if (!kurikulumId) return null;
      return cpmkCplMappingController.getMatriks(kurikulumId);
    },
  );

  const [matriksBkCpl] = createResource(
    () => ({ prodiId: prodiFilter(), active: activeTab() === 'bk-cpl' }),
    async ({ prodiId }) => {
      if (!prodiId) return null;
      return bahanKajianController.getMatriks(prodiId);
    },
  );

  function formatPersen(val: number): string {
    return (val * 100).toFixed(1) + '%';
  }

  function getBobotColor(val: number): string {
    if (val >= 0.5) return 'bg-emerald-500/30 text-emerald-300';
    if (val >= 0.25) return 'bg-yellow-500/30 text-yellow-300';
    if (val > 0) return 'bg-orange-500/30 text-orange-300';
    return 'bg-slate-700/50 text-slate-500';
  }

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-white">Peta OBE</h1>
        </div>

        <div class="flex gap-4 items-center flex-wrap">
          <div class="w-64">
            <Input
              type="select"
              placeholder="Program Studi"
              value={prodiFilter() ?? ''}
              onInput={(e: any) => {
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
            <div class="flex gap-2 bg-slate-800 rounded-xl p-1">
              <button
                class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab() === 'pl-cpl' ? 'bg-accent-500 text-white' : 'text-secondary-300 hover:text-white'}`}
                onClick={() => setActiveTab('pl-cpl')}
              >
                PL ⟷ CPL
              </button>
              <button
                class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab() === 'bk-cpl' ? 'bg-accent-500 text-white' : 'text-secondary-300 hover:text-white'}`}
                onClick={() => setActiveTab('bk-cpl')}
              >
                BK ⟷ CPL
              </button>
              <button
                class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab() === 'cpmk-cpl' ? 'bg-accent-500 text-white' : 'text-secondary-300 hover:text-white'}`}
                onClick={() => setActiveTab('cpmk-cpl')}
              >
                CPMK ⟷ CPL
              </button>
            </div>
          </Show>
          <Show when={activeTab() === 'cpmk-cpl' && prodiFilter()}>
            <div class="w-64">
              <Input
                type="select"
                placeholder="Kurikulum"
                value={kurikulumFilter() ?? ''}
                onInput={(e: any) =>
                  setKurikulumFilter(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)
                }
                isSelect
                selectOptions={[
                  { value: '', label: 'Pilih Kurikulum' },
                  ...(kurikulums()?.map((k) => ({ value: String(k.id), label: k.nama })) || []),
                ]}
              />
            </div>
          </Show>
        </div>

        {/* Tab: PL ⟷ CPL Matriks */}
        <Show when={activeTab() === 'pl-cpl'}>
          <Show
            when={matriksPlCpl() && !matriksPlCpl.loading}
            fallback={<div class="text-secondary-400 text-center py-12">Pilih program studi untuk melihat matriks</div>}
          >
            <Card variant="bordered" padding="lg">
              <h2 class="text-lg font-semibold text-white mb-4">Matriks Kontribusi CPL ke Profil Lulusan</h2>
              <p class="text-sm text-secondary-400 mb-4">
                Bobot dinormalisasi otomatis (total = 1.0 per CPL). Bobot kosong dianggap merata.
              </p>

              <Show when={matriksPlCpl()!}>
                {(data) => (
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="text-secondary-400 border-b border-slate-700">
                          <th class="text-left py-3 px-2 font-medium">CPL \ PL</th>
                          <For each={data().profilLulusan}>
                            {(pl) => <th class="text-center py-3 px-2 font-medium min-w-[100px]">{pl.kode}</th>}
                          </For>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={data().matriks}>
                          {(row) => (
                            <tr class="border-b border-slate-700/50">
                              <td class="py-3 px-2 text-white font-medium">{row.cpl.kode}</td>
                              <For each={row.bobotPerPl}>
                                {(bobot) => (
                                  <td class="py-3 px-2 text-center">
                                    <span
                                      class={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${getBobotColor(bobot.bobot)}`}
                                    >
                                      {formatPersen(bobot.bobot)}
                                    </span>
                                  </td>
                                )}
                              </For>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                )}
              </Show>

              <Show when={!matriksPlCpl()}>
                <div class="text-secondary-400 text-center py-8">Pilih program studi untuk melihat matriks</div>
              </Show>
            </Card>
          </Show>
        </Show>

        {/* Tab: BK ⟷ CPL Matriks */}
        <Show when={activeTab() === 'bk-cpl'}>
          <Show
            when={matriksBkCpl() && !matriksBkCpl.loading}
            fallback={<div class="text-secondary-400 text-center py-12">Pilih program studi untuk melihat matriks</div>}
          >
            <Card variant="bordered" padding="lg">
              <h2 class="text-lg font-semibold text-white mb-4">Matriks Kontribusi Bahan Kajian ke CPL</h2>
              <p class="text-sm text-secondary-400 mb-4">
                Bobot dinormalisasi otomatis (total = 1.0 per BK). Bobot kosong dianggap merata.
              </p>

              <Show when={matriksBkCpl()!}>
                {(data) => (
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="text-secondary-400 border-b border-slate-700">
                          <th class="text-left py-3 px-2 font-medium">BK \ CPL</th>
                          <For each={data().cpl}>
                            {(cpl) => <th class="text-center py-3 px-2 font-medium min-w-[100px]">{cpl.kode}</th>}
                          </For>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={data().matriks}>
                          {(row) => (
                            <tr class="border-b border-slate-700/50">
                              <td class="py-3 px-2 text-white font-medium">{row.bk.kode}</td>
                              <For each={row.bobotPerCpl}>
                                {(bobot) => (
                                  <td class="py-3 px-2 text-center">
                                    <span
                                      class={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${getBobotColor(bobot.bobot)}`}
                                    >
                                      {formatPersen(bobot.bobot)}
                                    </span>
                                  </td>
                                )}
                              </For>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                )}
              </Show>

              <Show when={!matriksBkCpl()}>
                <div class="text-secondary-400 text-center py-8">Pilih program studi untuk melihat matriks</div>
              </Show>
            </Card>
          </Show>
        </Show>

        {/* Tab: CPMK ⟷ CPL Matriks */}
        <Show when={activeTab() === 'cpmk-cpl'}>
          <Show
            when={matriksCpmkCpl() && !matriksCpmkCpl.loading}
            fallback={
              <div class="text-secondary-400 text-center py-12">
                Pilih program studi dan kurikulum untuk melihat matriks
              </div>
            }
          >
            <Show when={matriksCpmkCpl()!}>
              {(data) => (
                <div class="space-y-6">
                  <For each={data().matriks}>
                    {(row) => (
                      <Card variant="bordered" padding="lg">
                        <div class="flex items-center gap-3 mb-4">
                          <span class="text-accent-400 font-semibold text-lg">{row.cpl.kode}</span>
                          <span class="text-secondary-400 text-sm">{row.cpl.deskripsi}</span>
                        </div>
                        <div class="overflow-x-auto">
                          <table class="w-full text-sm">
                            <thead>
                              <tr class="text-secondary-400 border-b border-slate-700">
                                <th class="text-left py-2 px-2 font-medium">Kode CPMK</th>
                                <th class="text-left py-2 px-2 font-medium">Deskripsi</th>
                                <th class="text-left py-2 px-2 font-medium">Mata Kuliah</th>
                                <th class="text-center py-2 px-2 font-medium">Bobot</th>
                                <th class="text-center py-2 px-2 font-medium">Bobot Normalisasi</th>
                              </tr>
                            </thead>
                            <tbody>
                              <For
                                each={row.cpmkMappings}
                                fallback={
                                  <tr>
                                    <td colspan={5} class="text-center py-4 text-secondary-500">
                                      Belum ada mapping CPMK
                                    </td>
                                  </tr>
                                }
                              >
                                {(m) => (
                                  <tr class="border-b border-slate-700/50">
                                    <td class="py-2 px-2 text-white font-medium">{m.kode}</td>
                                    <td class="py-2 px-2 text-secondary-200 max-w-xs truncate">{m.deskripsi}</td>
                                    <td class="py-2 px-2 text-secondary-200">{m.mataKuliah?.nama || '-'}</td>
                                    <td class="py-2 px-2 text-center text-secondary-200">
                                      {m.bobot !== null ? m.bobot : '(merata)'}
                                    </td>
                                    <td class="py-2 px-2 text-center">
                                      <span
                                        class={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${getBobotColor(m.bobotNormalisasi)}`}
                                      >
                                        {formatPersen(m.bobotNormalisasi)}
                                      </span>
                                    </td>
                                  </tr>
                                )}
                              </For>
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )}
                  </For>
                </div>
              )}
            </Show>
          </Show>
        </Show>
      </div>
    </MainLayout>
  );
}
