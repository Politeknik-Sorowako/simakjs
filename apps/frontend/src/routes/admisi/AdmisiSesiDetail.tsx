import { createResource, createSignal, For, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiSesiDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, { refetch }] = createResource(() => Number(params.id), (id) =>
    admisiAdminController.getSessionDetail(id).then((r) => r.data),
  );

  const [showAddProdi, setShowAddProdi] = createSignal(false);
  const [prodiId, setProdiId] = createSignal('');
  const [kuota, setKuota] = createSignal('');
  const [passingGrade, setPassingGrade] = createSignal('');
  const [allProdis, setAllProdis] = createSignal<any[]>([]);

  createResource(async () => {
    const res = await admisiAdminController.getAllProdi();
    setAllProdis(res.data);
  });

  const handleAddProdi = async () => {
    if (!prodiId()) return;
    try {
      await admisiAdminController.addProdiToSession(Number(params.id), {
        prodiId: Number(prodiId()),
        kuota: kuota() ? Number(kuota()) : undefined,
        passingGrade: passingGrade() ? Number(passingGrade()) : undefined,
      });
      toast.showToast('Prodi ditambahkan', 'success');
      setShowAddProdi(false);
      setProdiId('');
      refetch();
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    }
  };

  const handleRemoveProdi = async (prodiId: number) => {
    try {
      await admisiAdminController.removeProdiFromSession(Number(params.id), prodiId);
      toast.showToast('Prodi dihapus', 'success');
      refetch();
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-5xl mx-auto">
        <button onClick={() => navigate('/admisi/manajemen/sesi')} class="text-sm text-brand-600 hover:text-brand-700 mb-4">
          ← Kembali ke Daftar Sesi
        </button>

        <Show when={session.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat...</div>
        </Show>

        <Show when={session()}>
          <h1 class="text-2xl font-bold mb-1">{session()?.nama}</h1>
          <p class="text-sm text-secondary-500 mb-6">Kode: {session()?.kode}</p>

          <div class="grid md:grid-cols-2 gap-4 mb-6">
            <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
              <h2 class="font-semibold text-sm mb-2">Informasi Sesi</h2>
              <div class="text-xs space-y-1 text-secondary-600 dark:text-secondary-300">
                <p>Mulai: {session()?.tanggalMulai}</p>
                <p>Tutup: {session()?.tanggalTutup}</p>
                <p>Verif: {session()?.tanggalVerif || '-'}</p>
                <p>Ujian: {session()?.tanggalUjian || '-'}</p>
                <p>Pengumuman: {session()?.tanggalPengumuman || '-'}</p>
                <p>Kuota: {session()?.kuota || 'Tak terbatas'}</p>
                <p>Status: <span class={`font-semibold ${session()?.isActive ? 'text-green-600' : 'text-red-500'}`}>
                  {session()?.isActive ? 'Aktif' : 'Nonaktif'}
                </span></p>
              </div>
            </div>

            <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <h2 class="font-semibold text-sm">Program Studi</h2>
                <Button size="sm" onClick={() => setShowAddProdi(!showAddProdi())}>
                  {showAddProdi() ? 'Batal' : '+ Prodi'}
                </Button>
              </div>

              <Show when={showAddProdi()}>
                <div class="flex gap-2 mb-3">
                  <select
                    value={prodiId()}
                    onChange={(e) => setProdiId(e.currentTarget.value)}
                    class="flex-1 px-2 py-1 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  >
                    <option value="">-- Pilih Prodi --</option>
                    <For each={allProdis()}>
                      {(p: any) => <option value={p.id}>{p.nama} ({p.jenjang})</option>}
                    </For>
                  </select>
                  <Button size="sm" onClick={handleAddProdi}>Tambah</Button>
                </div>
              </Show>

              <div class="space-y-1">
                <For each={session()?.prodis || []}>
                  {(sp: any) => (
                    <div class="flex items-center justify-between py-1.5 border-b border-secondary-100 dark:border-secondary-700 text-sm">
                      <span>Prodi #{sp.prodiId}</span>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-secondary-400">{sp.kuota ? `Kuota: ${sp.kuota}` : ''}</span>
                        <button onClick={() => handleRemoveProdi(sp.prodiId)} class="text-xs text-red-500 hover:text-red-700">Hapus</button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>

          {/* Document Requirements */}
          <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4 mb-6">
            <h2 class="font-semibold text-sm mb-2">Syarat Dokumen</h2>
            <For each={session()?.requirements || []}>
              {(req: any) => (
                <div class="text-sm py-1 border-b border-secondary-100 last:border-0">
                  {req.namaDokumen}
                  {req.isWajib ? <span class="text-red-500 ml-1">*</span> : ''}
                  <span class="text-xs text-secondary-400 ml-2">({req.formatFile || 'all'}, max {req.maxSizeKb}KB)</span>
                </div>
              )}
            </For>
            <Show when={session()?.requirements?.length === 0}>
              <p class="text-xs text-secondary-400">Belum ada syarat dokumen</p>
            </Show>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
