import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { cplMataKuliahController } from '../controllers/cplMataKuliahController';
import { cpmkController } from '../controllers/cpmkController';
import { kurikulumController } from '../controllers/kurikulumController';
import { prodiController } from '../controllers/prodiController';

export default function BobotPenilaianObe() {
  const toast = useToast();
  const [activeTab, setActiveTab] = createSignal<'cpl-mk' | 'cpmk-mk'>('cpl-mk');
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

  const [cplMkData] = createResource(
    () => kurikulumFilter(),
    async (kurikulumId) => {
      if (!kurikulumId) return null;
      return cplMataKuliahController.getMatriks(kurikulumId);
    },
  );

  const [selectedCpl, setSelectedCpl] = createSignal<number | undefined>(undefined);
  const [selectedMk, setSelectedMk] = createSignal<number | undefined>(undefined);
  const [bobotInput, setBobotInput] = createSignal<string>('');

  const handleAddCplMk = async () => {
    const cplId = selectedCpl();
    const mataKuliahId = selectedMk();
    const bobot = parseFloat(bobotInput());
    if (!cplId || !mataKuliahId || isNaN(bobot)) {
      toast.showToast('Lengkapi semua field', 'error');
      return;
    }
    try {
      await cplMataKuliahController.create({ cplId, mataKuliahId, bobot });
      toast.showToast('Mapping berhasil ditambahkan', 'success');
      setBobotInput('');
      setSelectedCpl(undefined);
      setSelectedMk(undefined);
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menambahkan mapping', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-white">Bobot Penilaian OBE</h1>
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

        <div class="flex gap-2">
          <Button variant={activeTab() === 'cpl-mk' ? 'primary' : 'secondary'} onClick={() => setActiveTab('cpl-mk')}>
            CPL → MK (Top-Down)
          </Button>
          <Button variant={activeTab() === 'cpmk-mk' ? 'primary' : 'secondary'} onClick={() => setActiveTab('cpmk-mk')}>
            CPMK → MK (Bottom-Up)
          </Button>
        </div>

        <Show when={activeTab() === 'cpl-mk'}>
          <Card variant="bordered" padding="lg">
            <h2 class="text-lg font-semibold text-white mb-4">Matriks CPL → Mata Kuliah</h2>
            <Show when={cplMkData()} keyed>
              {(data) => (
                <div class="space-y-4">
                  <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                      <thead>
                        <tr class="border-b border-slate-700">
                          <th class="text-left p-2 text-white">CPL</th>
                          <For each={data.mataKuliah}>
                            {(mk) => <th class="text-center p-2 text-white min-w-[120px]">{mk.kode}</th>}
                          </For>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={data.matriks}>
                          {(row) => (
                            <tr class="border-b border-slate-700/50">
                              <td class="p-2 text-white font-mono">{row.cpl.kode}</td>
                              <For each={row.bobotPerMk}>
                                {(cell) => (
                                  <td class="text-center p-2 text-secondary-200">
                                    {cell.bobotRaw > 0 ? `${cell.bobotRaw}%` : '-'}
                                  </td>
                                )}
                              </For>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>

                  <div class="border-t border-slate-700 pt-4">
                    <h3 class="text-md font-medium text-white mb-2">Tambah Mapping</h3>
                    <div class="flex gap-2 flex-wrap">
                      <div class="w-48">
                        <Input
                          type="select"
                          placeholder="Pilih CPL"
                          value={selectedCpl() ?? ''}
                          onInput={(e) =>
                            setSelectedCpl(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)
                          }
                          isSelect
                          selectOptions={[
                            { value: '', label: 'Pilih CPL' },
                            ...data.cpl.map((c: { id: number; kode: string; deskripsi: string }) => ({
                              value: String(c.id),
                              label: `${c.kode} - ${c.deskripsi.substring(0, 50)}...`,
                            })),
                          ]}
                        />
                      </div>
                      <div class="w-48">
                        <Input
                          type="select"
                          placeholder="Pilih MK"
                          value={selectedMk() ?? ''}
                          onInput={(e) =>
                            setSelectedMk(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)
                          }
                          isSelect
                          selectOptions={[
                            { value: '', label: 'Pilih MK' },
                            ...data.mataKuliah.map((mk: { id: number; kode: string; nama: string }) => ({
                              value: String(mk.id),
                              label: `${mk.kode} - ${mk.nama}`,
                            })),
                          ]}
                        />
                      </div>
                      <div class="w-32">
                        <Input
                          type="number"
                          placeholder="Bobot %"
                          value={bobotInput()}
                          onInput={(e) => setBobotInput(e.currentTarget.value)}
                        />
                      </div>
                      <Button onClick={handleAddCplMk}>Tambah</Button>
                    </div>
                  </div>
                </div>
              )}
            </Show>
            <Show when={!kurikulumFilter()}>
              <p class="text-secondary-400">Pilih Program Studi dan Kurikulum untuk melihat matriks.</p>
            </Show>
          </Card>
        </Show>

        <Show when={activeTab() === 'cpmk-mk'}>
          <Card variant="bordered" padding="lg">
            <h2 class="text-lg font-semibold text-white mb-4">Bobot CPMK dalam Mata Kuliah</h2>
            <p class="text-secondary-400 mb-4">
              Kelola bobot masing-masing CPMK terhadap Mata Kuliah. Total bobot CPMK per MK harus 100%.
            </p>
            <Show when={kurikulumFilter()}>
              <CpmkMkSection kurikulumId={kurikulumFilter()!} />
            </Show>
            <Show when={!kurikulumFilter()}>
              <p class="text-secondary-400">Pilih Program Studi dan Kurikulum untuk mengelola bobot CPMK.</p>
            </Show>
          </Card>
        </Show>
      </div>
    </MainLayout>
  );
}

function CpmkMkSection(props: { kurikulumId: number }) {
  const toast = useToast();
  const [mkFilter, setMkFilter] = createSignal<number | undefined>(undefined);

  const [cpmkList] = createResource(
    () => ({ kurikulumId: props.kurikulumId, mkId: mkFilter() }),
    async ({ kurikulumId, mkId }) => {
      const res = await cpmkController.getAll('', 1, 100, kurikulumId, mkId);
      return res.data;
    },
  );

  const handleUpdateBobot = async (cpmkId: number, bobotMk: number | null) => {
    try {
      await cpmkController.update(cpmkId, { bobotMk });
      toast.showToast('Bobot CPMK berhasil diupdate', 'success');
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal update bobot', 'error');
    }
  };

  return (
    <div class="space-y-4">
      <div class="w-64">
        <Input
          type="select"
          placeholder="Filter Mata Kuliah"
          value={mkFilter() ?? ''}
          onInput={(e) => setMkFilter(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
          isSelect
          selectOptions={[
            { value: '', label: 'Semua MK' },
            ...(cpmkList()
              ? [...new Map(cpmkList()!.map((c) => [c.mataKuliah?.id, c.mataKuliah])).values()]
                  .map((mk: any) => (mk ? { value: String(mk.id), label: `${mk.kode} - ${mk.nama}` } : null))
                  .filter((item): item is { value: string; label: string } => item !== null)
              : []),
          ]}
        />
      </div>

      <Show when={cpmkList() && cpmkList()!.length > 0}>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-700">
                <th class="text-left p-2 text-white">Kode CPMK</th>
                <th class="text-left p-2 text-white">Mata Kuliah</th>
                <th class="text-left p-2 text-white">Deskripsi</th>
                <th class="text-center p-2 text-white">Bobot MK (%)</th>
                <th class="text-center p-2 text-white">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <For each={cpmkList()}>
                {(cpmk) => (
                  <tr class="border-b border-slate-700/50">
                    <td class="p-2 text-white font-mono">{cpmk.kode}</td>
                    <td class="p-2 text-secondary-200">
                      {cpmk.mataKuliah?.kode} - {cpmk.mataKuliah?.nama}
                    </td>
                    <td class="p-2 text-secondary-200 max-w-[300px] truncate">{cpmk.deskripsi}</td>
                    <td class="p-2 text-center text-white">
                      <input
                        type="number"
                        class="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white w-20 text-center"
                        value={cpmk.bobotMk ?? ''}
                        onChange={(e) =>
                          handleUpdateBobot(cpmk.id, e.currentTarget.value ? parseFloat(e.currentTarget.value) : null)
                        }
                      />
                    </td>
                    <td class="p-2 text-center">
                      <Badge variant={cpmk.bobotMk ? 'success' : 'warning'}>
                        {cpmk.bobotMk ? `${cpmk.bobotMk}%` : 'Belum diisi'}
                      </Badge>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
}
