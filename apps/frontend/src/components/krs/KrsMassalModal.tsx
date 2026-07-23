import { createResource, createSignal, For, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { kelasKuliahController } from '../../controllers/kelasKuliahController';
import { krsController } from '../../controllers/krsController';
import { mahasiswaController } from '../../controllers/mahasiswaController';
import { prodiController } from '../../controllers/prodiController';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Table } from '../ui/Table';

interface KrsMassalModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function KrsMassalModal(props: KrsMassalModalProps) {
  const toast = useToast();
  const workspace = useWorkspace();

  const [step, setStep] = createSignal<1 | 2>(1);
  const [submitting, setSubmitting] = createSignal(false);

  // Step 1: Mahasiswa selection state & filters
  const [selectedMhsIds, setSelectedMhsIds] = createSignal<number[]>([]);
  const [mhsSearch, setMhsSearch] = createSignal('');
  const [mhsProdiId, setMhsProdiId] = createSignal<number | undefined>(workspace.activeProdiId() || undefined);
  const [mhsStatus, setMhsStatus] = createSignal('aktif');

  // Fetch Mahasiswa (limit 1000 for selection)
  const [mahasiswaList] = createResource(
    () => ({
      search: mhsSearch(),
      prodiId: mhsProdiId() || workspace.activeProdiId() || undefined,
      status: mhsStatus(),
    }),
    async ({ search, prodiId, status }) => {
      const res = await mahasiswaController.getAll(search, 1, 1000, prodiId || undefined, {
        filterStatus: status,
      });
      return res.data;
    },
  );

  // Step 2: Kelas Kuliah selection state & filters
  const [selectedKelasIds, setSelectedKelasIds] = createSignal<number[]>([]);
  const [kelasSearch, setKelasSearch] = createSignal('');
  const [kelasProdiId, setKelasProdiId] = createSignal<number | undefined>(workspace.activeProdiId() || undefined);

  // Fetch Kelas Kuliah
  const [kelasList] = createResource(
    () => ({
      search: kelasSearch(),
      prodiId: kelasProdiId() || workspace.activeProdiId() || undefined,
      periodeId: workspace.activePeriodeId(),
    }),
    async ({ search, prodiId, periodeId }) => {
      const res = await kelasKuliahController.getAll(search, 1, 1000, prodiId || undefined, periodeId || undefined);
      return res.data;
    },
  );

  // Dropdown list
  const [prodiOptions] = createResource(() => prodiController.getAll(undefined, 1, 100));

  // Toggle Mahasiswa Checkbox
  const toggleSelectMhs = (id: number) => {
    setSelectedMhsIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAllMhs = () => {
    const list = mahasiswaList() || [];
    if (selectedMhsIds().length === list.length && list.length > 0) {
      setSelectedMhsIds([]);
    } else {
      setSelectedMhsIds(list.map((m) => m.id));
    }
  };

  // Toggle Kelas Checkbox
  const toggleSelectKelas = (id: number) => {
    setSelectedKelasIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAllKelas = () => {
    const list = kelasList() || [];
    if (selectedKelasIds().length === list.length && list.length > 0) {
      setSelectedKelasIds([]);
    } else {
      setSelectedKelasIds(list.map((k) => k.id));
    }
  };

  const handleNextStep = () => {
    if (selectedMhsIds().length === 0) {
      toast.showToast('Pilih minimal satu mahasiswa aktif untuk melanjutkan', 'info');
      return;
    }
    setStep(2);
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const handleSubmitBulkKrs = async () => {
    if (selectedKelasIds().length === 0) {
      toast.showToast('Pilih minimal satu kelas kuliah', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const res = await krsController.bulkCreate(selectedMhsIds(), selectedKelasIds());
      toast.showToast(
        `Berhasil membuat ${res.createdCount} KRS. (${res.skippedCount} dilewati karena sudah terdaftar)`,
        'success',
      );
      props.onSuccess();
      props.onClose();
      // Reset state
      setStep(1);
      setSelectedMhsIds([]);
      setSelectedKelasIds([]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal memproses KRS massal';
      toast.showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      show={props.show}
      onClose={props.onClose}
      title={
        step() === 1
          ? '⚡ Buat KRS Massal — Langkah 1: Pilih Mahasiswa'
          : '⚡ Buat KRS Massal — Langkah 2: Pilih Kelas Kuliah'
      }
      maxWidth="xl"
    >
      <div class="p-6 flex flex-col gap-4">
        {/* Step Indicator */}
        <div class="flex items-center justify-between border-b pb-3 border-secondary-200 dark:border-secondary-700">
          <div class="flex items-center gap-2">
            <span
              class={`px-3 py-1 rounded-full text-xs font-bold ${
                step() === 1
                  ? 'bg-brand-600 text-white'
                  : 'bg-secondary-200 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300'
              }`}
            >
              1. Pilih Mahasiswa ({selectedMhsIds().length})
            </span>
            <span class="text-secondary-400">➔</span>
            <span
              class={`px-3 py-1 rounded-full text-xs font-bold ${
                step() === 2
                  ? 'bg-brand-600 text-white'
                  : 'bg-secondary-200 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300'
              }`}
            >
              2. Pilih Kelas ({selectedKelasIds().length})
            </span>
          </div>
          <span class="text-xs text-secondary-500 font-medium">Periode: {workspace.activePeriodeId() || '-'}</span>
        </div>

        {/* STEP 1 CONTENT */}
        <Show when={step() === 1}>
          {/* Filters Step 1 */}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-secondary-50 dark:bg-secondary-800/50 p-3 rounded-xl">
            <div>
              <label class="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Cari (NIM / Nama)
              </label>
              <input
                type="text"
                placeholder="Pencarian..."
                class="w-full px-2.5 py-1.5 text-xs border rounded-md border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 dark:text-white"
                value={mhsSearch()}
                onInput={(e) => setMhsSearch(e.currentTarget.value)}
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Program Studi
              </label>
              <select
                class="w-full px-2.5 py-1.5 text-xs border rounded-md border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 dark:text-white"
                value={mhsProdiId() || ''}
                onChange={(e) => setMhsProdiId(Number(e.currentTarget.value) || undefined)}
              >
                <option value="">Semua Prodi</option>
                <For each={prodiOptions()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Status</label>
              <select
                class="w-full px-2.5 py-1.5 text-xs border rounded-md border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 dark:text-white"
                value={mhsStatus()}
                onChange={(e) => setMhsStatus(e.currentTarget.value)}
              >
                <option value="aktif">Aktif</option>
                <option value="">Semua Status</option>
                <option value="cuti">Cuti</option>
              </select>
            </div>
          </div>

          {/* Table Mahasiswa */}
          <div class="max-h-80 overflow-y-auto border border-secondary-200 dark:border-secondary-700 rounded-xl">
            <Table
              headers={[
                <input
                  type="checkbox"
                  checked={
                    (mahasiswaList() || []).length > 0 && selectedMhsIds().length === (mahasiswaList() || []).length
                  }
                  onChange={toggleSelectAllMhs}
                  class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500"
                />,
                'NIM',
                'Nama Mahasiswa',
                'Program Studi',
                'Status',
              ]}
            >
              <For each={mahasiswaList() || []}>
                {(item) => (
                  <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/50">
                    <td class="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedMhsIds().includes(item.id)}
                        onChange={() => toggleSelectMhs(item.id)}
                        class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500"
                      />
                    </td>
                    <td class="px-4 py-2 font-mono text-xs text-secondary-800 dark:text-white">{item.nim}</td>
                    <td class="px-4 py-2 text-xs font-medium text-secondary-800 dark:text-white">{item.nama}</td>
                    <td class="px-4 py-2 text-xs text-secondary-600 dark:text-secondary-300">
                      {item.programStudi?.nama || '-'}
                    </td>
                    <td class="px-4 py-2 text-xs">
                      <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-50 text-accent-700 border border-accent-100">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={(mahasiswaList() || []).length === 0}>
                <tr>
                  <td colspan="5" class="px-4 py-8 text-center text-xs text-secondary-400">
                    Tidak ada mahasiswa ditemukan.
                  </td>
                </tr>
              </Show>
            </Table>
          </div>

          {/* Footer Step 1 */}
          <div class="flex justify-between items-center pt-2">
            <span class="text-xs text-secondary-600 dark:text-secondary-300 font-medium">
              {selectedMhsIds().length} Mahasiswa dipilih
            </span>
            <div class="flex gap-2">
              <Button variant="secondary" onClick={props.onClose}>
                Batal
              </Button>
              <Button onClick={handleNextStep} disabled={selectedMhsIds().length === 0}>
                Selanjutnya ➔
              </Button>
            </div>
          </div>
        </Show>

        {/* STEP 2 CONTENT */}
        <Show when={step() === 2}>
          {/* Filters Step 2 */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-secondary-50 dark:bg-secondary-800/50 p-3 rounded-xl">
            <div>
              <label class="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Cari Kelas / Mata Kuliah
              </label>
              <input
                type="text"
                placeholder="Nama MK / Kode / Kelas..."
                class="w-full px-2.5 py-1.5 text-xs border rounded-md border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 dark:text-white"
                value={kelasSearch()}
                onInput={(e) => setKelasSearch(e.currentTarget.value)}
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Program Studi
              </label>
              <select
                class="w-full px-2.5 py-1.5 text-xs border rounded-md border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 dark:text-white"
                value={kelasProdiId() || ''}
                onChange={(e) => setKelasProdiId(Number(e.currentTarget.value) || undefined)}
              >
                <option value="">Semua Prodi</option>
                <For each={prodiOptions()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </div>
          </div>

          {/* Table Kelas Kuliah */}
          <div class="max-h-80 overflow-y-auto border border-secondary-200 dark:border-secondary-700 rounded-xl">
            <Table
              headers={[
                <input
                  type="checkbox"
                  checked={(kelasList() || []).length > 0 && selectedKelasIds().length === (kelasList() || []).length}
                  onChange={toggleSelectAllKelas}
                  class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500"
                />,
                'Kode MK',
                'Mata Kuliah',
                'Kelas',
                'SKS',
                'Pengajar',
              ]}
            >
              <For each={kelasList() || []}>
                {(item) => (
                  <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/50">
                    <td class="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedKelasIds().includes(item.id)}
                        onChange={() => toggleSelectKelas(item.id)}
                        class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500"
                      />
                    </td>
                    <td class="px-4 py-2 font-mono text-xs text-secondary-800 dark:text-white">
                      {item.mataKuliah?.kode || '-'}
                    </td>
                    <td class="px-4 py-2 text-xs font-medium text-secondary-800 dark:text-white">
                      {item.mataKuliah?.nama || '-'}
                    </td>
                    <td class="px-4 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400">{item.namaKelas}</td>
                    <td class="px-4 py-2 text-xs text-secondary-600 dark:text-secondary-300">
                      {item.mataKuliah?.sksTotal || '-'} SKS
                    </td>
                    <td class="px-4 py-2 text-xs text-secondary-600 dark:text-secondary-300">
                      {item.dosenPengajarKelas
                        ?.map((d) => d.dosen?.nama)
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </td>
                  </tr>
                )}
              </For>
              <Show when={(kelasList() || []).length === 0}>
                <tr>
                  <td colspan="6" class="px-4 py-8 text-center text-xs text-secondary-400">
                    Tidak ada kelas kuliah pada periode ini.
                  </td>
                </tr>
              </Show>
            </Table>
          </div>

          {/* Summary Box */}
          <div class="p-3 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 rounded-xl flex items-center justify-between">
            <span class="text-xs text-brand-800 dark:text-brand-300 font-medium">
              Total Entri KRS yang akan dibuat: <strong>{selectedMhsIds().length} Mahasiswa</strong> ×{' '}
              <strong>{selectedKelasIds().length} Kelas</strong> ={' '}
              <strong>{selectedMhsIds().length * selectedKelasIds().length} Entri KRS</strong>
            </span>
          </div>

          {/* Footer Step 2 */}
          <div class="flex justify-between items-center pt-2">
            <Button variant="secondary" onClick={handlePrevStep}>
              ⬅ Kembali
            </Button>
            <div class="flex gap-2">
              <Button variant="secondary" onClick={props.onClose}>
                Batal
              </Button>
              <Button
                variant="success"
                onClick={handleSubmitBulkKrs}
                disabled={submitting() || selectedKelasIds().length === 0}
              >
                {submitting() ? 'Memproses...' : '⚡ Buat KRS Massal'}
              </Button>
            </div>
          </div>
        </Show>
      </div>
    </Modal>
  );
}
