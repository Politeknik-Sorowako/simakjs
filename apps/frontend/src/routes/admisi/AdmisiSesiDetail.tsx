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
  const [allProdis, setAllProdis] = createSignal<any[]>([]);

  // Syarat Dokumen state
  const [showAddReq, setShowAddReq] = createSignal(false);
  const [reqForm, setReqForm] = createSignal<Record<string, string>>({});
  const [savingReq, setSavingReq] = createSignal(false);

  createResource(async () => {
    const res = await admisiAdminController.getAllProdi();
    setAllProdis(res.data);
  });

  const handleAddProdi = async () => {
    if (!prodiId()) return;
    try {
      await admisiAdminController.addProdiToSession(Number(params.id), {
        prodiId: Number(prodiId()),
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

  const handleToggleProdi = async (prodiId: number) => {
    try {
      const res = await admisiAdminController.toggleProdiActive(Number(params.id), prodiId);
      toast.showToast(res.message, 'success');
      refetch();
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    }
  };

  // ─── Syarat Dokumen ──────────────────────────────────────────────
  const handleAddRequirement = async (e: Event) => {
    e.preventDefault();
    if (!reqForm().namaDokumen) return;
    setSavingReq(true);
    try {
      await admisiAdminController.createDocumentRequirement({
        sessionId: Number(params.id),
        namaDokumen: reqForm().namaDokumen,
        deskripsi: reqForm().deskripsi || null,
        isWajib: reqForm().isWajib !== '0',
        formatFile: reqForm().formatFile || null,
        maxSizeKb: Number(reqForm().maxSizeKb) || 2048,
        urutan: Number(reqForm().urutan) || 0,
      });
      toast.showToast('Syarat dokumen ditambahkan', 'success');
      setShowAddReq(false);
      setReqForm({});
      refetch();
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    } finally {
      setSavingReq(false);
    }
  };

  const handleDeleteRequirement = async (reqId: number) => {
    try {
      await admisiAdminController.deleteDocumentRequirement(reqId);
      toast.showToast('Syarat dokumen dihapus', 'success');
      refetch();
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    }
  };

  const presetDocuments = [
    { nama: 'KTP', format: 'jpg,png,pdf', size: 2048, wajib: true, desc: 'Scan KTP (max 2MB)' },
    { nama: 'Ijazah / SKL', format: 'jpg,png,pdf', size: 2048, wajib: true, desc: 'Scan Ijazah atau Surat Keterangan Lulus' },
    { nama: 'Pasfoto', format: 'jpg,png', size: 1024, wajib: true, desc: 'Pasfoto 3x4 atau 4x6 (max 1MB)' },
    { nama: 'Persyaratan Tambahan', format: 'pdf', size: 5120, wajib: false, desc: 'Dokumen tambahan digabung dalam 1 file PDF (multipage, max 5MB)' },
  ];

  const applyPreset = (preset: typeof presetDocuments[0]) => {
    setReqForm({
      namaDokumen: preset.nama,
      deskripsi: preset.desc,
      formatFile: preset.format,
      isWajib: preset.wajib ? '1' : '0',
      maxSizeKb: String(preset.size),
      urutan: '0',
    });
    setShowAddReq(true);
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
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
                    <div class="flex items-center justify-between py-2 border-b border-secondary-100 dark:border-secondary-700 text-sm">
                      <div class="flex items-center gap-2">
                        <span class="font-medium">{sp.namaProdi || `Prodi #${sp.prodiId}`}</span>
                        <span class="text-xs text-secondary-400">({sp.jenjang || '-'})</span>
                        <span class={`text-xs px-1.5 py-0.5 rounded-full ${sp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {sp.isActive ? 'Dibuka' : 'Ditutup'}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleProdi(sp.prodiId)}
                          class={`text-xs px-2 py-1 rounded border ${
                            sp.isActive
                              ? 'border-amber-300 text-amber-600 hover:bg-amber-50'
                              : 'border-green-300 text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {sp.isActive ? 'Tutup' : 'Buka'}
                        </button>
                        <button onClick={() => handleRemoveProdi(sp.prodiId)} class="text-xs text-red-500 hover:text-red-700">Hapus</button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>

          {/* ─── SYARAT DOKUMEN ───────────────────────────────────────── */}
          <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4 mb-6">
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold text-sm">Syarat Dokumen</h2>
              <div class="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setShowAddReq(true); setReqForm({ formatFile: 'jpg,png,pdf', maxSizeKb: '2048', isWajib: '1' }); }}>
                  + Buat Baru
                </Button>
                <Button size="sm" onClick={() => setShowAddReq(!showAddReq())}>
                  {showAddReq() ? 'Tutup' : '+ Preset'}
                </Button>
              </div>
            </div>

            {/* Preset quick-add */}
            <Show when={showAddReq() && !reqForm().namaDokumen}>
              <div class="flex flex-wrap gap-2 mb-3">
                <For each={presetDocuments}>
                  {(preset) => (
                    <button
                      onClick={() => applyPreset(preset)}
                      class="text-xs px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-lg border border-brand-200 dark:border-brand-800 hover:bg-brand-100"
                    >
                      {preset.nama}
                    </button>
                  )}
                </For>
              </div>
            </Show>

            {/* Add/Edit Form */}
            <Show when={showAddReq() && reqForm().namaDokumen !== undefined}>
              <form onSubmit={handleAddRequirement} class="grid md:grid-cols-3 gap-3 mb-4 p-3 bg-secondary-50 dark:bg-secondary-800/60 rounded-lg border border-secondary-200 dark:border-secondary-700">
                <div>
                  <label class="text-xs font-medium block mb-0.5">Nama Dokumen</label>
                  <input
                    required value={reqForm().namaDokumen || ''}
                    onInput={(e) => setReqForm((p) => ({ ...p, namaDokumen: e.currentTarget.value }))}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                    placeholder="Nama dokumen"
                  />
                </div>
                <div>
                  <label class="text-xs font-medium block mb-0.5">Format (pisahkan dengan koma)</label>
                  <input
                    value={reqForm().formatFile || 'jpg,png,pdf'}
                    onInput={(e) => setReqForm((p) => ({ ...p, formatFile: e.currentTarget.value }))}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                    placeholder="jpg,png,pdf"
                  />
                </div>
                <div>
                  <label class="text-xs font-medium block mb-0.5">Max Size (KB)</label>
                  <input
                    type="number" value={reqForm().maxSizeKb || '2048'}
                    onInput={(e) => setReqForm((p) => ({ ...p, maxSizeKb: e.currentTarget.value }))}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  />
                </div>
                <div>
                  <label class="text-xs font-medium block mb-0.5">Deskripsi</label>
                  <input
                    value={reqForm().deskripsi || ''}
                    onInput={(e) => setReqForm((p) => ({ ...p, deskripsi: e.currentTarget.value }))}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                    placeholder="Keterangan tambahan"
                  />
                </div>
                <div>
                  <label class="text-xs font-medium block mb-0.5">Wajib?</label>
                  <select
                    value={reqForm().isWajib || '1'}
                    onChange={(e) => setReqForm((p) => ({ ...p, isWajib: e.currentTarget.value }))}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  >
                    <option value="1">Wajib</option>
                    <option value="0">Opsional</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs font-medium block mb-0.5">Urutan</label>
                  <input
                    type="number" value={reqForm().urutan || '0'}
                    onInput={(e) => setReqForm((p) => ({ ...p, urutan: e.currentTarget.value }))}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  />
                </div>
                <div class="md:col-span-3 flex gap-2">
                  <Button type="submit" size="sm" disabled={savingReq()}>{savingReq() ? 'Menyimpan...' : 'Simpan'}</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => { setShowAddReq(false); setReqForm({}); }}>Batal</Button>
                </div>
              </form>
            </Show>

            {/* Daftar syarat dokumen */}
            <div class="space-y-1">
              <For each={session()?.requirements || []}>
                {(req: any) => (
                  <div class="flex items-center justify-between py-2 border-b border-secondary-100 dark:border-secondary-700 text-sm">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{req.namaDokumen}</span>
                      {req.isWajib ? <span class="text-xs text-red-500 font-semibold">*wajib</span> : <span class="text-xs text-secondary-400">opsional</span>}
                      <span class="text-xs text-secondary-400">
                        ({req.formatFile || 'semua format'}, max {req.maxSizeKb}KB)
                      </span>
                    </div>
                    <button onClick={() => handleDeleteRequirement(req.id)} class="text-xs text-red-500 hover:text-red-700">Hapus</button>
                  </div>
                )}
              </For>
            </div>
            <Show when={session()?.requirements?.length === 0}>
              <p class="text-xs text-secondary-400 py-2">Belum ada syarat dokumen. Gunakan tombol <strong>+ Preset</strong> untuk menambah dokumen standar (KTP, Ijazah, Pasfoto) atau <strong>+ Buat Baru</strong> untuk syarat tambahan.</p>
            </Show>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
