import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
  apelController,
  KelompokApel,
  PresensiApelItem,
  SesiApel,
  SesiPresensiResponse,
} from '../controllers/apelController';

export default function ApelKelola() {
  const auth = useAuth();
  const toast = useToast();
  const ws = useWorkspace();

  const [selectedKelompok, setSelectedKelompok] = createSignal<number | null>(null);
  const [selectedSesi, setSelectedSesi] = createSignal<number | null>(null);
  const [tanggal, setTanggal] = createSignal(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = createSignal('pagi');
  const [jamMulai, setJamMulai] = createSignal('');
  const [presensiData, setPresensiData] = createSignal<PresensiApelItem[]>([]);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const [kelompokList] = createResource(
    () => ws.selectedProdiId(),
    async (prodiId) => {
      const user = auth.user();
      if (user?.role === 'dosen') {
        const dosenId = user.id as unknown as number;
        return apelController.getKelompokByProdi(prodiId || undefined, dosenId);
      }
      return apelController.getKelompokByProdi(prodiId || undefined);
    },
  );

  const [sesiList, { refetch: refetchSesi }] = createResource(
    () => selectedKelompok(),
    async (kelompokId) => {
      if (!kelompokId) return [];
      return apelController.getSesiByKelompok(kelompokId);
    },
  );

  const [sesiPresensi, { refetch: refetchPresensi }] = createResource(
    () => selectedSesi(),
    async (sesiId) => {
      if (!sesiId) return null;
      const data = await apelController.getSesiPresensi(sesiId);
      setPresensiData(data.presensi);
      return data;
    },
  );

  const handleBukaSesi = async () => {
    if (!selectedKelompok() || !tanggal() || !jamMulai()) {
      toast.showToast('Lengkapi data sesi (kelompok, tanggal, jam mulai)', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      const result = await apelController.bukaSesi({
        kelompokApelId: selectedKelompok()!,
        tanggal: tanggal(),
        shift: shift(),
        jamMulai: jamMulai(),
      });
      toast.showToast(`Sesi dibuka dengan ${result.jumlahAnggota} mahasiswa`, 'success');
      refetchSesi();
      setSelectedSesi(result.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal membuka sesi';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = (mahasiswaId: number, newStatus: 'hadir' | 'terlambat' | 'unknown') => {
    setPresensiData((prev) =>
      prev.map((p) => {
        if (p.mahasiswaId === mahasiswaId) {
          return {
            ...p,
            status: newStatus,
            menitTerlambat: newStatus === 'terlambat' ? p.menitTerlambat || 0 : undefined,
          };
        }
        return p;
      }),
    );
  };

  const handleMenitChange = (mahasiswaId: number, menit: number) => {
    setPresensiData((prev) =>
      prev.map((p) => {
        if (p.mahasiswaId === mahasiswaId) {
          return { ...p, menitTerlambat: menit };
        }
        return p;
      }),
    );
  };

  const handleSubmit = async () => {
    if (!selectedSesi()) return;
    try {
      setIsSubmitting(true);
      const list = presensiData().map((p) => ({
        mahasiswaId: p.mahasiswaId,
        status: p.status,
        menitTerlambat: p.menitTerlambat,
      }));
      await apelController.submitPresensi(selectedSesi()!, list);
      toast.showToast('Presensi berhasil disimpan', 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan presensi';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTutupSesi = async () => {
    if (!selectedSesi()) return;
    try {
      setIsSubmitting(true);
      await apelController.tutupSesi(selectedSesi()!);
      toast.showToast('Sesi berhasil ditutup', 'success');
      setSelectedSesi(null);
      setPresensiData([]);
      refetchSesi();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal menutup sesi';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadSesiDetail = (sesiId: number) => {
    setSelectedSesi(sesiId);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      hadir: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      terlambat: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<string, string> = {
      hadir: 'Hadir',
      terlambat: 'Terlambat',
      unknown: 'Unknown',
    };
    return (
      <span class={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <MainLayout>
      <div class="space-y-6">
        <h1 class="text-2xl font-bold">Presensi Apel Pagi & Sore</h1>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Kelompok + Buat Sesi */}
          <div class="lg:col-span-1 space-y-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 class="text-lg font-semibold mb-3">Pilih Kelompok</h2>
              <select
                class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                value={selectedKelompok() ?? ''}
                onChange={(e) => {
                  setSelectedKelompok(Number(e.target.value) || null);
                  setSelectedSesi(null);
                  setPresensiData([]);
                }}
              >
                <option value="">-- Pilih Kelompok --</option>
                <For each={kelompokList()}>
                  {(item: KelompokApel) => (
                    <option value={item.id}>
                      {item.namaKelompok} ({item.shift}) - {item.dosenNama}
                    </option>
                  )}
                </For>
              </select>
            </div>

            <Show when={selectedKelompok()}>
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
                <h2 class="text-lg font-semibold">Buka Sesi Baru</h2>
                <div>
                  <label class="block text-sm font-medium mb-1">Tanggal</label>
                  <input
                    type="date"
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    value={tanggal()}
                    onChange={(e) => setTanggal(e.target.value)}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Shift</label>
                  <select
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    value={shift()}
                    onChange={(e) => setShift(e.target.value)}
                  >
                    <option value="pagi">Pagi</option>
                    <option value="sore">Sore</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    value={jamMulai()}
                    onChange={(e) => setJamMulai(e.target.value)}
                  />
                </div>
                <button
                  class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  onClick={handleBukaSesi}
                  disabled={isSubmitting()}
                >
                  {isSubmitting() ? 'Memproses...' : 'Buka Sesi'}
                </button>
              </div>
            </Show>

            <Show when={selectedKelompok() && sesiList() && sesiList()!.length > 0}>
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 class="text-lg font-semibold mb-3">Riwayat Sesi</h2>
                <div class="space-y-2 max-h-64 overflow-y-auto">
                  <For each={sesiList()}>
                    {(sesi: SesiApel) => (
                      <button
                        class={`w-full text-left p-2 rounded text-sm border ${sesi.id === selectedSesi() ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700'}`}
                        onClick={() => loadSesiDetail(sesi.id)}
                      >
                        <div class="font-medium">{sesi.tanggal}</div>
                        <div class="text-xs text-gray-500">
                          {sesi.shift} | {sesi.jamMulai} | {sesi.isClosed ? 'Tertutup' : 'Aktif'}
                          {sesi.hadirCount !== undefined &&
                            ` | H:${sesi.hadirCount} T:${sesi.terlambatCount} ?:${sesi.unknownCount}`}
                        </div>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>

          {/* Right: Presensi Table */}
          <div class="lg:col-span-2">
            <Show
              when={selectedSesi() && sesiPresensi()}
              fallback={
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500">
                  Pilih sesi apel untuk melihat atau mengelola presensi
                </div>
              }
            >
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div class="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <h2 class="text-lg font-semibold">
                      Presensi - {sesiPresensi()?.sesi.tanggal} ({sesiPresensi()?.sesi.shift})
                    </h2>
                    <p class="text-sm text-gray-500">
                      {sesiPresensi()?.sesi.jamMulai} | {sesiPresensi()?.sesi.dosenNama}
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      onClick={handleSubmit}
                      disabled={isSubmitting() || sesiPresensi()?.sesi.isClosed}
                    >
                      Simpan
                    </button>
                    <button
                      class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      onClick={handleTutupSesi}
                      disabled={isSubmitting() || sesiPresensi()?.sesi.isClosed}
                    >
                      Tutup Sesi
                    </button>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">No</th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">NIM</th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">Nama</th>
                        <th class="px-4 py-3 text-center text-xs font-medium uppercase">Status</th>
                        <th class="px-4 py-3 text-center text-xs font-medium uppercase">Menit Terlambat</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y dark:divide-gray-700">
                      <For each={presensiData()}>
                        {(item: PresensiApelItem, idx) => (
                          <tr class="hover:bg-gray-50 dark:hover:bg-gray-750">
                            <td class="px-4 py-3 text-sm">{idx() + 1}</td>
                            <td class="px-4 py-3 text-sm font-mono">{item.mahasiswaNim}</td>
                            <td class="px-4 py-3 text-sm">{item.mahasiswaNama}</td>
                            <td class="px-4 py-3 text-center">
                              <div class="flex items-center justify-center gap-1">
                                <button
                                  class={`px-2 py-1 rounded text-xs font-medium ${item.status === 'hadir' ? 'bg-green-600 text-white ring-2 ring-green-400' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                                  onClick={() => handleStatusChange(item.mahasiswaId, 'hadir')}
                                >
                                  H
                                </button>
                                <button
                                  class={`px-2 py-1 rounded text-xs font-medium ${item.status === 'terlambat' ? 'bg-yellow-500 text-white ring-2 ring-yellow-400' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                                  onClick={() => handleStatusChange(item.mahasiswaId, 'terlambat')}
                                >
                                  T
                                </button>
                                <button
                                  class={`px-2 py-1 rounded text-xs font-medium ${item.status === 'unknown' ? 'bg-gray-600 text-white ring-2 ring-gray-400' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                                  onClick={() => handleStatusChange(item.mahasiswaId, 'unknown')}
                                >
                                  ?
                                </button>
                              </div>
                            </td>
                            <td class="px-4 py-3 text-center">
                              <Show when={item.status === 'terlambat'}>
                                <input
                                  type="number"
                                  min={1}
                                  class="w-20 border rounded px-2 py-1 text-sm text-center dark:bg-gray-700 dark:border-gray-600"
                                  value={item.menitTerlambat || ''}
                                  onChange={(e) => handleMenitChange(item.mahasiswaId, parseInt(e.target.value) || 0)}
                                />
                              </Show>
                            </td>
                          </tr>
                        )}
                      </For>
                      <Show when={presensiData().length === 0}>
                        <tr>
                          <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                            Belum ada data presensi
                          </td>
                        </tr>
                      </Show>
                    </tbody>
                  </table>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
