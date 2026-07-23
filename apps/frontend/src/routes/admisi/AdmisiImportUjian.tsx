import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiImportUjian() {
  const toast = useToast();
  const [sessionId, setSessionId] = createSignal('');
  const [selected, setSelected] = createSignal<Set<number>>(new Set());
  const [saving, setSaving] = createSignal(false);

  // Exam schedule form
  const [tanggal, setTanggal] = createSignal('');
  const [waktuMulai, setWaktuMulai] = createSignal('');
  const [waktuSelesai, setWaktuSelesai] = createSignal('');
  const [tipeUjian, setTipeUjian] = createSignal('tulis');
  const [lokasiType, setLokasiType] = createSignal('kampus');
  const [lokasiDetail, setLokasiDetail] = createSignal('');

  const [sessions] = createResource(() => admisiAdminController.getSessions());

  const [candidates, { refetch }] = createResource(
    () => (sessionId() ? Number(sessionId()) : undefined),
    (sid) => admisiAdminController.getApplications({ sessionId: sid, status: 'documents_verified' }),
  );

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const ids = candidates()?.data?.map((a: { id: number }) => a.id) || [];
    if (selected().size === ids.length) setSelected(new Set<number>());
    else setSelected(new Set<number>(ids));
  };

  const handleImport = async () => {
    if (!sessionId() || !tanggal() || !waktuMulai() || selected().size === 0) {
      toast.showToast('Pilih sesi, tanggal, jam, dan minimal 1 peserta', 'error');
      return;
    }
    setSaving(true);
    let success = 0,
      fail = 0;
    for (const appId of selected()) {
      try {
        await admisiAdminController.createExamSchedule({
          applicationId: appId,
          sessionId: Number(sessionId()),
          tipeUjian: tipeUjian(),
          tanggal: tanggal(),
          waktuMulai: waktuMulai(),
          waktuSelesai: waktuSelesai() || undefined,
          lokasiType: lokasiType(),
          lokasiDetail: lokasiDetail() || undefined,
        });
        success++;
      } catch {
        fail++;
      }
    }
    toast.showToast(`${success} peserta dijadwalkan, ${fail} gagal`, success > 0 ? 'success' : 'error');
    setSaving(false);
    setSelected(new Set<number>());
    refetch();
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <h1 class="text-2xl font-bold mb-2">Import Peserta ke Ujian</h1>
        <p class="text-sm text-secondary-500 mb-6">
          Pilih peserta yang sudah terverifikasi dokumennya, lalu jadwalkan ujian secara massal
        </p>

        <div class="flex gap-3 mb-4">
          <select
            value={sessionId()}
            onChange={(e) => {
              setSessionId(e.currentTarget.value);
              setSelected(new Set<number>());
            }}
            class="px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm bg-white dark:bg-secondary-800"
          >
            <option value="">-- Pilih Sesi --</option>
            <For each={sessions()?.data || []}>
              {(s: { id: number; nama: string }) => <option value={s.id}>{s.nama}</option>}
            </For>
          </select>
        </div>

        <Show when={sessionId()}>
          <div class="grid md:grid-cols-2 gap-6">
            {/* Left: Candidate list */}
            <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <h2 class="font-semibold text-sm">Peserta Terverifikasi</h2>
                <button onClick={selectAll} class="text-xs text-brand-600 hover:text-brand-700">
                  {selected().size === (candidates()?.data?.length || 0) ? 'Unselect All' : 'Select All'}
                </button>
              </div>
              <Show when={candidates.loading}>
                <p class="text-xs text-secondary-400">Memuat...</p>
              </Show>
              <Show when={candidates()?.data?.length === 0}>
                <p class="text-xs text-amber-600">Tidak ada peserta dengan status documents_verified.</p>
              </Show>
              <div class="space-y-1 max-h-96 overflow-y-auto">
                <For each={candidates()?.data || []}>
                  {(a: { id: number; noPendaftar: string; namaLengkap: string }) => (
                    <div class="flex items-center gap-2 py-1.5 text-sm border-b border-secondary-100 dark:border-secondary-800">
                      <input
                        type="checkbox"
                        checked={selected().has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        class="rounded border-secondary-300 text-brand-600"
                      />
                      <span class="font-mono text-xs text-secondary-400">{a.noPendaftar}</span>
                      <span>{a.namaLengkap || '-'}</span>
                    </div>
                  )}
                </For>
              </div>
              <div class="mt-2 text-xs text-secondary-400">Terpilih: {selected().size} peserta</div>
            </div>

            {/* Right: Schedule form */}
            <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
              <h2 class="font-semibold text-sm mb-3">Atur Jadwal Ujian</h2>
              <div class="space-y-3">
                <div>
                  <label class="text-xs font-medium block mb-0.5">Tipe Ujian</label>
                  <select
                    value={tipeUjian()}
                    onChange={(e) => setTipeUjian(e.currentTarget.value)}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  >
                    <option value="tulis">Tes Tulis</option>
                    <option value="wawancara">Wawancara</option>
                    <option value="fisik">Tes Fisik</option>
                    <option value="praktek">Praktek</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs font-medium block mb-0.5">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={tanggal()}
                    onInput={(e) => setTanggal(e.currentTarget.value)}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-xs font-medium block mb-0.5">Jam Mulai</label>
                    <input
                      type="time"
                      required
                      value={waktuMulai()}
                      onInput={(e) => setWaktuMulai(e.currentTarget.value)}
                      class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-medium block mb-0.5">Jam Selesai</label>
                    <input
                      type="time"
                      value={waktuSelesai()}
                      onInput={(e) => setWaktuSelesai(e.currentTarget.value)}
                      class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                    />
                  </div>
                </div>
                <div>
                  <label class="text-xs font-medium block mb-0.5">Lokasi</label>
                  <select
                    value={lokasiType()}
                    onChange={(e) => setLokasiType(e.currentTarget.value)}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  >
                    <option value="kampus">Kampus</option>
                    <option value="online">Online</option>
                    <option value="mitra_industri">Mitra Industri</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs font-medium block mb-0.5">Detail Lokasi</label>
                  <input
                    value={lokasiDetail()}
                    onInput={(e) => setLokasiDetail(e.currentTarget.value)}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                    placeholder="Ruang 201 / Link Zoom"
                  />
                </div>
                <Button onClick={handleImport} disabled={saving() || selected().size === 0} class="w-full">
                  {saving() ? 'Memproses...' : `Import ${selected().size} Peserta ke Ujian`}
                </Button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
