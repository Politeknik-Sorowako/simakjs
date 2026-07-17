import { useNavigate, useParams } from '@solidjs/router';
import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiSesiDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, { refetch }] = createResource(
    () => Number(params.id),
    (id) => admisiAdminController.getSessionDetail(id).then((r) => r.data),
  );

  const [showAddProdi, setShowAddProdi] = createSignal(false);
  const [prodiId, setProdiId] = createSignal('');
  const [biayaDaftar, setBiayaDaftar] = createSignal('');
  const [allProdis, setAllProdis] = createSignal<{ id: number; nama: string; jenjang: string }[]>([]);
  const [editBiaya, setEditBiaya] = createSignal<string>(''); // 'prodiId:value' or ''

  // Syarat Dokumen state
  const [showAddReq, setShowAddReq] = createSignal(false);
  const [reqForm, setReqForm] = createSignal<Record<string, string>>({});
  const [savingReq, setSavingReq] = createSignal(false);
  // Exam types
  const [showAddExam, setShowAddExam] = createSignal(false);
  const [examForm, setExamForm] = createSignal<Record<string, string>>({});
  const [savingExam, setSavingExam] = createSignal(false);
  const [components, { refetch: refetchComponents }] = createResource(
    () => Number(params.id),
    (id) => admisiAdminController.getSelectionComponents(id).then((r) => r.data),
  );

  createResource(async () => {
    const res = await admisiAdminController.getAllProdi();
    setAllProdis(res.data);
  });

  const handleAddProdi = async () => {
    if (!prodiId()) return;
    try {
      await admisiAdminController.addProdiToSession(Number(params.id), {
        prodiId: Number(prodiId()),
        biayaDaftar: biayaDaftar() ? Number(biayaDaftar()) : undefined,
      });
      toast.showToast('Prodi ditambahkan', 'success');
      setShowAddProdi(false);
      setProdiId('');
      setBiayaDaftar('');
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    }
  };

  const handleRemoveProdi = async (prodiId: number) => {
    try {
      await admisiAdminController.removeProdiFromSession(Number(params.id), prodiId);
      toast.showToast('Prodi dihapus', 'success');
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    }
  };

  const handleToggleProdi = async (prodiId: number) => {
    try {
      const res = await admisiAdminController.toggleProdiActive(Number(params.id), prodiId);
      toast.showToast(res.message, 'success');
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
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
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    } finally {
      setSavingReq(false);
    }
  };

  const handleDeleteRequirement = async (reqId: number) => {
    try {
      await admisiAdminController.deleteDocumentRequirement(reqId);
      toast.showToast('Syarat dokumen dihapus', 'success');
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    }
  };

  // ─── Exam Types ──────────────────────────────────────────────────
  const handleAddExamType = async (e: Event) => {
    e.preventDefault();
    if (!examForm().namaKomponen) return;
    setSavingExam(true);
    try {
      await admisiAdminController.createSelectionComponent({
        sessionId: Number(params.id),
        namaKomponen: examForm().namaKomponen,
        bobot: Number(examForm().bobot) || 0,
        tipePenilai: examForm().tipePenilai || 'admin',
        urutan: Number(examForm().urutan) || 0,
      });
      toast.showToast('Tipe ujian ditambahkan', 'success');
      setShowAddExam(false);
      setExamForm({});
      refetch();
      refetchComponents();
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    } finally {
      setSavingExam(false);
    }
  };

  const handleDeleteExamType = async (componentId: number) => {
    try {
      await admisiAdminController.deleteSelectionComponent(componentId);
      toast.showToast('Tipe ujian dihapus', 'success');
      refetch();
      refetchComponents();
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    }
  };

  const presetDocuments = [
    { nama: 'KTP', format: 'jpg,png,pdf', size: 2048, wajib: true, desc: 'Scan KTP (max 2MB)' },
    {
      nama: 'Ijazah / SKL',
      format: 'jpg,png,pdf',
      size: 2048,
      wajib: true,
      desc: 'Scan Ijazah atau Surat Keterangan Lulus',
    },
    { nama: 'Pasfoto', format: 'jpg,png', size: 1024, wajib: true, desc: 'Pasfoto 3x4 atau 4x6 (max 1MB)' },
    {
      nama: 'Persyaratan Tambahan',
      format: 'pdf',
      size: 5120,
      wajib: false,
      desc: 'Dokumen tambahan digabung dalam 1 file PDF (multipage, max 5MB)',
    },
  ];

  const applyPreset = (preset: (typeof presetDocuments)[0]) => {
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
        <button
          onClick={() => navigate('/admisi/manajemen/sesi')}
          class="text-sm text-brand-600 hover:text-brand-700 mb-4"
        >
          ← Kembali ke Daftar Sesi
        </button>

        <Show when={session.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat...</div>
        </Show>

        <Show when={session()}>
          <h1 class="text-2xl font-bold mb-1">{session()?.nama}</h1>
          <p class="text-sm text-secondary-500 mb-6">Kode: {session()?.kode}</p>

          {/* Warning: session not visible */}
          <Show when={!session()?.isActive || !session()?.prodis?.length}>
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 text-xs text-amber-700 dark:text-amber-400">
              {!session()?.isActive
                ? '⚠️ Sesi ini tidak aktif. Calon mahasiswa tidak bisa melihatnya. Aktifkan dari menu detail.'
                : ''}
              {session()?.isActive && !session()?.prodis?.length
                ? '⚠️ Sesi aktif tetapi belum memiliki program studi. Tambahkan prodi agar calon mahasiswa bisa mendaftar.'
                : ''}
            </div>
          </Show>

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
                <p>
                  Status:{' '}
                  <span class={`font-semibold ${session()?.isActive ? 'text-green-600' : 'text-red-500'}`}>
                    {session()?.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </p>
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
                <div class="flex gap-2 mb-3 flex-wrap">
                  <select
                    value={prodiId()}
                    onChange={(e) => setProdiId(e.currentTarget.value)}
                    class="flex-1 min-w-[150px] px-2 py-1 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  >
                    <option value="">-- Pilih Prodi --</option>
                    <For each={allProdis()}>
                      {(p: { id: number; nama: string; jenjang: string }) => (
                        <option value={p.id}>
                          {p.nama} ({p.jenjang})
                        </option>
                      )}
                    </For>
                  </select>
                  <input
                    type="number"
                    placeholder="Biaya daftar (Rp)"
                    value={biayaDaftar()}
                    onInput={(e) => setBiayaDaftar(e.currentTarget.value)}
                    class="w-40 px-2 py-1 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  />
                  <Button size="sm" onClick={handleAddProdi}>
                    Tambah
                  </Button>
                </div>
              </Show>

              <div class="space-y-1">
                <For each={session()?.prodis || []}>
                  {(sp: {
                    namaProdi: string;
                    prodiId: number;
                    jenjang: string;
                    isActive: boolean;
                    biayaDaftar?: number;
                  }) => (
                    <div class="flex items-center justify-between py-2 border-b border-secondary-100 dark:border-secondary-700 text-sm">
                      <div class="flex items-center gap-2">
                        <span class="font-medium">{sp.namaProdi || `Prodi #${sp.prodiId}`}</span>
                        <span class="text-xs text-secondary-400">({sp.jenjang || '-'})</span>
                        <span
                          class={`text-xs px-1.5 py-0.5 rounded-full ${sp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {sp.isActive ? 'Dibuka' : 'Ditutup'}
                        </span>
                        <Show when={editBiaya() !== `${sp.prodiId}`}>
                          <Show when={sp.biayaDaftar}>
                            <span
                              onClick={() => setEditBiaya(String(sp.prodiId))}
                              class="text-xs text-secondary-400 cursor-pointer hover:text-brand-600"
                            >
                              Rp {Number(sp.biayaDaftar).toLocaleString('id-ID')} ✏️
                            </span>
                          </Show>
                          <Show when={!sp.biayaDaftar}>
                            <span
                              onClick={() => setEditBiaya(String(sp.prodiId))}
                              class="text-xs text-green-600 font-semibold cursor-pointer hover:text-brand-600"
                            >
                              GRATIS ✏️
                            </span>
                          </Show>
                        </Show>
                        <Show when={editBiaya() === `${sp.prodiId}`}>
                          <input
                            type="number"
                            defaultValue={sp.biayaDaftar || ''}
                            ref={(el: HTMLInputElement) => setTimeout(() => el?.focus(), 100)}
                            onBlur={async (e: FocusEvent) => {
                              const val = (e.currentTarget as HTMLInputElement).value;
                              try {
                                await admisiAdminController.updateSesiProdi(Number(params.id), sp.prodiId, {
                                  biayaDaftar: val ? Number(val) : null,
                                });
                                setEditBiaya('');
                                refetch();
                              } catch {
                                setEditBiaya('');
                              }
                            }}
                            class="w-24 px-1 py-0.5 border border-secondary-300 rounded text-xs bg-white"
                            placeholder="0 = gratis"
                          />
                        </Show>
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
                        <button
                          onClick={() => handleRemoveProdi(sp.prodiId)}
                          class="text-xs text-red-500 hover:text-red-700"
                        >
                          Hapus
                        </button>
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
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowAddReq(true);
                    setReqForm({ formatFile: 'jpg,png,pdf', maxSizeKb: '2048', isWajib: '1' });
                  }}
                >
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
              <form
                onSubmit={handleAddRequirement}
                class="grid md:grid-cols-3 gap-3 mb-4 p-3 bg-secondary-50 dark:bg-secondary-800/60 rounded-lg border border-secondary-200 dark:border-secondary-700"
              >
                <div>
                  <label class="text-xs font-medium block mb-0.5">Nama Dokumen</label>
                  <input
                    required
                    value={reqForm().namaDokumen || ''}
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
                    type="number"
                    value={reqForm().maxSizeKb || '2048'}
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
                    type="number"
                    value={reqForm().urutan || '0'}
                    onInput={(e) => setReqForm((p) => ({ ...p, urutan: e.currentTarget.value }))}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  />
                </div>
                <div class="md:col-span-3 flex gap-2">
                  <Button type="submit" size="sm" disabled={savingReq()}>
                    {savingReq() ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setShowAddReq(false);
                      setReqForm({});
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </Show>

            {/* Daftar syarat dokumen */}
            <div class="space-y-1">
              <For each={session()?.requirements || []}>
                {(req: {
                  id: number;
                  namaDokumen: string;
                  isWajib: boolean;
                  formatFile?: string;
                  maxSizeKb: number;
                }) => (
                  <div class="flex items-center justify-between py-2 border-b border-secondary-100 dark:border-secondary-700 text-sm">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{req.namaDokumen}</span>
                      {req.isWajib ? (
                        <span class="text-xs text-red-500 font-semibold">*wajib</span>
                      ) : (
                        <span class="text-xs text-secondary-400">opsional</span>
                      )}
                      <span class="text-xs text-secondary-400">
                        ({req.formatFile || 'semua format'}, max {req.maxSizeKb}KB)
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteRequirement(req.id)}
                      class="text-xs text-red-500 hover:text-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </For>
            </div>
            <Show when={session()?.requirements?.length === 0}>
              <p class="text-xs text-secondary-400 py-2">
                Belum ada syarat dokumen. Gunakan tombol <strong>+ Preset</strong> untuk menambah dokumen standar (KTP,
                Ijazah, Pasfoto) atau <strong>+ Buat Baru</strong> untuk syarat tambahan.
              </p>
            </Show>
          </div>

          {/* ─── TIPE UJIAN / SELEKSI ─────────────────────────────────── */}
          <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4 mb-6">
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold text-sm">Tipe Ujian / Seleksi</h2>
              <div class="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setShowAddExam(!showAddExam());
                    setExamForm({ bobot: '0', tipePenilai: 'admin', urutan: '0' });
                  }}
                >
                  {showAddExam() ? 'Batal' : '+ Tipe Baru'}
                </Button>
              </div>
            </div>

            <Show when={showAddExam()}>
              <form
                onSubmit={handleAddExamType}
                class="grid md:grid-cols-4 gap-3 mb-4 p-3 bg-secondary-50 dark:bg-secondary-800/60 rounded-lg border border-secondary-200 dark:border-secondary-700"
              >
                <div>
                  <label class="text-xs font-medium block mb-0.5">Nama</label>
                  <input
                    required
                    value={examForm().namaKomponen || ''}
                    onInput={(e) => setExamForm((p) => ({ ...p, namaKomponen: e.currentTarget.value }))}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                    placeholder="Tes Tulis / Wawancara"
                  />
                </div>
                <div>
                  <label class="text-xs font-medium block mb-0.5">Bobot (%)</label>
                  <input
                    type="number"
                    required
                    value={examForm().bobot || ''}
                    onInput={(e) => setExamForm((p) => ({ ...p, bobot: e.currentTarget.value }))}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  />
                </div>
                <div>
                  <label class="text-xs font-medium block mb-0.5">Penilai</label>
                  <select
                    value={examForm().tipePenilai || 'admin'}
                    onChange={(e) => setExamForm((p) => ({ ...p, tipePenilai: e.currentTarget.value }))}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  >
                    <option value="admin">Admin</option>
                    <option value="reviewer">Reviewer</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs font-medium block mb-0.5">Urutan</label>
                  <input
                    type="number"
                    value={examForm().urutan || '0'}
                    onInput={(e) => setExamForm((p) => ({ ...p, urutan: e.currentTarget.value }))}
                    class="w-full px-2 py-1.5 border border-secondary-300 rounded text-sm bg-white dark:bg-secondary-800"
                  />
                </div>
                <div class="md:col-span-4 flex gap-2">
                  <Button type="submit" size="sm" disabled={savingExam()}>
                    {savingExam() ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setShowAddExam(false);
                      setExamForm({});
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </Show>

            <div class="space-y-1">
              <For each={components() || []}>
                {(c: { id: number; namaKomponen: string; bobot: number; tipePenilai: string }) => (
                  <div class="flex items-center justify-between py-2 border-b border-secondary-100 dark:border-secondary-700 text-sm">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{c.namaKomponen}</span>
                      <span class="text-xs text-secondary-400">Bobot: {c.bobot}%</span>
                      <span class="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {c.tipePenilai}
                      </span>
                    </div>
                    <button onClick={() => handleDeleteExamType(c.id)} class="text-xs text-red-500 hover:text-red-700">
                      Hapus
                    </button>
                  </div>
                )}
              </For>
            </div>
            <Show when={(!components() || components()!.length === 0) && !showAddExam()}>
              <p class="text-xs text-secondary-400 py-2">
                Belum ada tipe ujian. Tambahkan Tes Tulis, Wawancara, Tes Fisik, atau Praktek.
              </p>
            </Show>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
