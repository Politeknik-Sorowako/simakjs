import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';
import { admisiController } from '../../controllers/admisiController';

export default function AdmisiVerifikasi() {
  const toast = useToast();
  const [sessionFilter, setSessionFilter] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('');
  const [selectedApp, setSelectedApp] = createSignal<Record<string, unknown> | null>(null);
  const [appDocs, setAppDocs] = createSignal<Record<string, unknown>[]>([]);
  const [requirements, setRequirements] = createSignal<{ id: number; namaDokumen: string; isWajib: boolean }[]>([]);
  const [uploadingReq, setUploadingReq] = createSignal<number | null>(null);
  const [allProdis, setAllProdis] = createSignal<{ id: number; nama: string; jenjang: string }[]>([]);
  const [editProdi, setEditProdi] = createSignal<number | null>(null);
  const [newP1, setNewP1] = createSignal<number | null>(null);
  const [newP2, setNewP2] = createSignal<number | null>(null);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [editBiodata, setEditBiodata] = createSignal<number | null>(null);
  const [bioForm, setBioForm] = createSignal<Record<string, string>>({});

  createResource(() => admisiAdminController.getAllProdi().then((r) => setAllProdis(r.data)));

  const [sessions] = createResource(() => admisiAdminController.getSessions());

  const [apps, { refetch }] = createResource(
    () => ({
      sessionId: sessionFilter() ? Number(sessionFilter()) : undefined,
      status: statusFilter() || undefined,
      search: searchTerm() || undefined,
    }),
    (f) => admisiAdminController.getApplications(f),
  );

  const loadDocs = async (app: { id: number; sessionId?: number }) => {
    try {
      const [docsRes, reqsRes] = await Promise.all([
        admisiController.getDocuments(app.id),
        admisiController.getDocumentRequirements(app.sessionId || 0),
      ]);
      setAppDocs(docsRes.data);
      setRequirements(reqsRes.data);
    } catch {
      setAppDocs([]);
      setRequirements([]);
    }
  };

  const handleSelectApp = async (app: { id: number; sessionId?: number }) => {
    if (selectedApp()?.id === app.id) {
      setSelectedApp(null);
      setAppDocs([]);
      setRequirements([]);
      return;
    }
    setSelectedApp(app);
    await loadDocs(app);
  };

  const handleVerify = async (docId: number, verified: boolean, rejectionNote?: string) => {
    try {
      await admisiAdminController.verifyDocument(docId, verified, rejectionNote);
      toast.showToast(verified ? 'Dokumen diverifikasi' : 'Dokumen ditolak', 'success');
      if (selectedApp()) await loadDocs(selectedApp() as any);
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    }
  };

  // Build merged list: required docs + upload status
  const mergedDocs = () => {
    const reqs = requirements();
    const docs = appDocs();
    return reqs.map((req) => {
      const uploaded = (docs || []).filter((d) => (d as any).requirementId === req.id);
      const latest = uploaded[uploaded.length - 1] || null;
      return { req, uploaded, latest };
    });
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <h1 class="text-2xl font-bold mb-2">Verifikasi Dokumen</h1>
        <p class="text-sm text-secondary-500 mb-6">Periksa dan verifikasi dokumen pendaftar</p>

        <div class="flex gap-3 mb-4 flex-wrap">
          <select
            value={sessionFilter()}
            onChange={(e) => {
              setSessionFilter(e.currentTarget.value);
              setSelectedApp(null);
            }}
            class="px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm bg-white dark:bg-secondary-800"
          >
            <option value="">-- Semua Sesi --</option>
            <For each={sessions()?.data || []}>
              {(s: { id: number; nama: string }) => <option value={s.id}>{s.nama}</option>}
            </For>
          </select>
          <select
            value={statusFilter()}
            onChange={(e) => {
              setStatusFilter(e.currentTarget.value);
              setSelectedApp(null);
            }}
            class="px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm bg-white dark:bg-secondary-800"
          >
            <option value="">-- Semua Status --</option>
            <option value="submitted">Menunggu Verifikasi</option>
            <option value="documents_verified">Terverifikasi</option>
            <option value="documents_rejected">Ditolak</option>
            <option value="draft">Draft</option>
            <option value="returned">Dikembalikan</option>
          </select>
          <input
            type="text"
            placeholder="Cari nama atau no pendaftar..."
            value={searchTerm()}
            onInput={(e) => {
              setSearchTerm(e.currentTarget.value);
              setSelectedApp(null);
            }}
            class="px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm bg-white dark:bg-secondary-800 min-w-[200px] flex-1"
          />
        </div>

        <Show when={apps.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat...</div>
        </Show>

        <div class="grid gap-3">
          <For each={apps()?.data || []}>
            {(app: {
              id: number;
              noPendaftar?: string;
              namaLengkap?: string;
              nama?: string;
              status: string;
              sessionId: number;
              nik?: string;
              tempatLahir?: string;
              tanggalLahir?: string;
              jenisKelamin?: string;
              namaIbuKandung?: string;
              asalSekolah?: string;
              telepon?: string;
              jalan?: string;
              prodiPilihan1?: number;
              prodiPilihan2?: number;
            }) => (
              <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <span class="font-mono text-xs text-secondary-400">{app.noPendaftar || '--'}</span>
                    <span class="font-semibold ml-2">{app.namaLengkap || app.nama || '-'}</span>
                  </div>
                  <span
                    class={`text-xs px-2 py-0.5 rounded-full ${
                      app.status === 'submitted'
                        ? 'bg-blue-100 text-blue-700'
                        : app.status === 'documents_verified'
                          ? 'bg-green-100 text-green-700'
                          : app.status === 'documents_rejected'
                            ? 'bg-red-100 text-red-700'
                            : app.status === 'draft'
                              ? 'bg-gray-100 text-gray-600'
                              : app.status === 'returned'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
                <div class="flex gap-2">
                  <Button size="sm" onClick={() => handleSelectApp(app)}>
                    {selectedApp()?.id === app.id ? 'Tutup' : 'Lihat Dokumen'}
                  </Button>
                  {(app.status === 'submitted' || app.status === 'documents_rejected' || app.status === 'returned') && (
                    <>
                      <Button
                        size="sm"
                        style="background:#059669;color:white"
                        onClick={async () => {
                          try {
                            const res = await admisiAdminController.verifyAllDocuments(app.id);
                            toast.showToast(res.message, 'success');
                            refetch();
                          } catch (err: unknown) {
                            toast.showToast((err as Error).message, 'error');
                          }
                        }}
                      >
                        ✓ Setujui Semua
                      </Button>
                      <Button
                        size="sm"
                        style="background:#0d9488;color:white"
                        onClick={async () => {
                          try {
                            const res = await admisiAdminController.markDocsVerified(app.id);
                            toast.showToast(res.message, 'success');
                            refetch();
                          } catch (err: unknown) {
                            toast.showToast((err as Error).message, 'error');
                          }
                        }}
                      >
                        Ubah Status ke Terverifikasi
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await admisiAdminController.reopenApplication(app.id);
                        toast.showToast('Akses dibuka untuk melengkapi berkas', 'success');
                        refetch();
                      } catch (err: unknown) {
                        toast.showToast((err as Error).message, 'error');
                      }
                    }}
                  >
                    {app.status === 'returned' ? 'Buka Lagi' : 'Buka Akses'}
                  </Button>
                </div>

                <Show when={selectedApp()?.id === app.id}>
                  <div class="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
                    {/* Biodata */}
                    <div class="mb-3 p-3 bg-secondary-50 dark:bg-secondary-800/60 rounded-lg text-xs">
                      <div class="flex items-center justify-between mb-2">
                        <span class="font-semibold">Biodata</span>
                        <button
                          onClick={() => {
                            if (editBiodata() === app.id) {
                              setEditBiodata(null);
                              return;
                            }
                            setEditBiodata(app.id);
                            setBioForm({
                              namaLengkap: app.namaLengkap || '',
                              nik: app.nik || '',
                              tempatLahir: app.tempatLahir || '',
                              tanggalLahir: app.tanggalLahir || '',
                              jenisKelamin: app.jenisKelamin || '',
                              namaIbuKandung: app.namaIbuKandung || '',
                              asalSekolah: app.asalSekolah || '',
                              telepon: app.telepon || '',
                              jalan: app.jalan || '',
                            });
                          }}
                          class="text-xs px-2 py-1 bg-brand-100 text-brand-700 rounded hover:bg-brand-200"
                        >
                          {editBiodata() === app.id ? 'Batal' : 'Edit Biodata'}
                        </button>
                      </div>

                      <Show when={editBiodata() !== app.id}>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div>
                            <span class="font-semibold">NIK</span>
                            <p>{app.nik || '-'}</p>
                          </div>
                          <div>
                            <span class="font-semibold">Nama</span>
                            <p>{app.namaLengkap || '-'}</p>
                          </div>
                          <div>
                            <span class="font-semibold">Tempat/Tgl Lahir</span>
                            <p>
                              {app.tempatLahir || '-'} / {app.tanggalLahir || '-'}
                            </p>
                          </div>
                          <div>
                            <span class="font-semibold">JK</span>
                            <p>
                              {app.jenisKelamin === 'L' ? 'Laki-laki' : app.jenisKelamin === 'P' ? 'Perempuan' : '-'}
                            </p>
                          </div>
                          <div>
                            <span class="font-semibold">Ibu Kandung</span>
                            <p>{app.namaIbuKandung || '-'}</p>
                          </div>
                          <div>
                            <span class="font-semibold">Asal Sekolah</span>
                            <p>{app.asalSekolah || '-'}</p>
                          </div>
                          <div>
                            <span class="font-semibold">Telepon</span>
                            <p>{app.telepon || '-'}</p>
                          </div>
                          <div>
                            <span class="font-semibold">Alamat</span>
                            <p>{app.jalan || '-'}</p>
                          </div>
                        </div>
                      </Show>

                      <Show when={editBiodata() === app.id}>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div>
                            <span class="font-semibold">NIK</span>
                            <input
                              value={bioForm().nik || ''}
                              onInput={(e) => setBioForm((p) => ({ ...p, nik: e.currentTarget.value }))}
                              class="w-full px-2 py-1 border border-secondary-300 rounded text-xs bg-white dark:bg-secondary-800"
                            />
                          </div>
                          <div>
                            <span class="font-semibold">Nama</span>
                            <input
                              value={bioForm().namaLengkap || ''}
                              onInput={(e) => setBioForm((p) => ({ ...p, namaLengkap: e.currentTarget.value }))}
                              class="w-full px-2 py-1 border border-secondary-300 rounded text-xs bg-white dark:bg-secondary-800"
                            />
                          </div>
                          <div>
                            <span class="font-semibold">Tempat Lahir</span>
                            <input
                              value={bioForm().tempatLahir || ''}
                              onInput={(e) => setBioForm((p) => ({ ...p, tempatLahir: e.currentTarget.value }))}
                              class="w-full px-2 py-1 border border-secondary-300 rounded text-xs bg-white dark:bg-secondary-800"
                            />
                          </div>
                          <div>
                            <span class="font-semibold">Tgl Lahir</span>
                            <input
                              value={bioForm().tanggalLahir || ''}
                              onInput={(e) => setBioForm((p) => ({ ...p, tanggalLahir: e.currentTarget.value }))}
                              class="w-full px-2 py-1 border border-secondary-300 rounded text-xs bg-white dark:bg-secondary-800"
                            />
                          </div>
                          <div>
                            <span class="font-semibold">JK</span>
                            <select
                              value={bioForm().jenisKelamin || ''}
                              onChange={(e) => setBioForm((p) => ({ ...p, jenisKelamin: e.currentTarget.value }))}
                              class="w-full px-2 py-1 border border-secondary-300 rounded text-xs bg-white dark:bg-secondary-800"
                            >
                              <option value="">--</option>
                              <option value="L">Laki-laki</option>
                              <option value="P">Perempuan</option>
                            </select>
                          </div>
                          <div>
                            <span class="font-semibold">Ibu Kandung</span>
                            <input
                              value={bioForm().namaIbuKandung || ''}
                              onInput={(e) => setBioForm((p) => ({ ...p, namaIbuKandung: e.currentTarget.value }))}
                              class="w-full px-2 py-1 border border-secondary-300 rounded text-xs bg-white dark:bg-secondary-800"
                            />
                          </div>
                          <div>
                            <span class="font-semibold">Asal Sekolah</span>
                            <input
                              value={bioForm().asalSekolah || ''}
                              onInput={(e) => setBioForm((p) => ({ ...p, asalSekolah: e.currentTarget.value }))}
                              class="w-full px-2 py-1 border border-secondary-300 rounded text-xs bg-white dark:bg-secondary-800"
                            />
                          </div>
                          <div>
                            <span class="font-semibold">Telepon</span>
                            <input
                              value={bioForm().telepon || ''}
                              onInput={(e) => setBioForm((p) => ({ ...p, telepon: e.currentTarget.value }))}
                              class="w-full px-2 py-1 border border-secondary-300 rounded text-xs bg-white dark:bg-secondary-800"
                            />
                          </div>
                          <div class="md:col-span-4">
                            <span class="font-semibold">Alamat</span>
                            <input
                              value={bioForm().jalan || ''}
                              onInput={(e) => setBioForm((p) => ({ ...p, jalan: e.currentTarget.value }))}
                              class="w-full px-2 py-1 border border-secondary-300 rounded text-xs bg-white dark:bg-secondary-800"
                            />
                          </div>
                          <div class="md:col-span-4 flex gap-2 mt-1">
                            <button
                              onClick={async () => {
                                try {
                                  await admisiAdminController.updateAppBiodata(app.id, bioForm());
                                  toast.showToast('Biodata diperbarui', 'success');
                                  setEditBiodata(null);
                                  refetch();
                                } catch (err: unknown) {
                                  toast.showToast((err as Error).message, 'error');
                                }
                              }}
                              class="text-xs px-3 py-1 bg-brand-600 text-white rounded hover:bg-brand-700"
                            >
                              Simpan Biodata
                            </button>
                          </div>
                        </div>
                      </Show>
                    </div>

                    {/* Pilihan Prodi */}
                    <div class="mb-3 p-3 bg-secondary-50 dark:bg-secondary-800/60 rounded-lg text-xs">
                      <div class="flex items-center justify-between">
                        <div>
                          <span class="font-semibold">Pilihan Prodi</span>
                          <Show when={editProdi() !== app.id}>
                            <p>
                              P1: {(() => {
                                const p = allProdis().find((x) => x.id === app.prodiPilihan1);
                                return p ? `${p.nama} (${p.jenjang || '-'})` : `#${app.prodiPilihan1}`;
                              })()}
                              {app.prodiPilihan2
                                ? ` | P2: ${(() => {
                                    const p = allProdis().find((x) => x.id === app.prodiPilihan2);
                                    return p ? `${p.nama} (${p.jenjang || '-'})` : `#${app.prodiPilihan2}`;
                                  })()}`
                                : ''}
                            </p>
                          </Show>
                          <Show when={editProdi() === app.id}>
                            <div class="flex gap-2 mt-1 items-center">
                              <select
                                value={newP1() ?? app.prodiPilihan1}
                                onChange={(e) => setNewP1(Number(e.currentTarget.value))}
                                class="px-2 py-1 border border-secondary-300 rounded text-xs bg-white dark:bg-secondary-800"
                              >
                                <For each={allProdis()}>
                                  {(p: { id: number; nama: string }) => <option value={p.id}>{p.nama}</option>}
                                </For>
                              </select>
                              <span class="text-secondary-400">P2:</span>
                              <select
                                value={newP2() ?? app.prodiPilihan2 ?? ''}
                                onChange={(e) => setNewP2(e.currentTarget.value ? Number(e.currentTarget.value) : null)}
                                class="px-2 py-1 border border-secondary-300 rounded text-xs bg-white dark:bg-secondary-800"
                              >
                                <option value="">--</option>
                                <For each={allProdis()}>
                                  {(p: { id: number; nama: string }) => <option value={p.id}>{p.nama}</option>}
                                </For>
                              </select>
                              <button
                                onClick={async () => {
                                  try {
                                    await admisiAdminController.updateAppProdi(
                                      app.id,
                                      newP1() || app.prodiPilihan1 || 0,
                                      newP2(),
                                    );
                                    toast.showToast('Prodi diubah', 'success');
                                    setEditProdi(null);
                                    refetch();
                                  } catch (err: unknown) {
                                    toast.showToast((err as Error).message, 'error');
                                  }
                                }}
                                class="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700"
                              >
                                Simpan
                              </button>
                              <button
                                onClick={() => setEditProdi(null)}
                                class="text-xs px-2 py-1 border border-secondary-300 rounded"
                              >
                                Batal
                              </button>
                            </div>
                          </Show>
                        </div>
                        {editProdi() !== app.id && (
                          <button
                            onClick={() => {
                              setEditProdi(app.id);
                              setNewP1(null);
                              setNewP2(null);
                            }}
                            class="text-xs px-2 py-1 bg-brand-100 text-brand-700 rounded hover:bg-brand-200"
                          >
                            Ubah
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dokumen */}
                    <div class="space-y-2">
                      <Show when={mergedDocs().length === 0}>
                        <p class="text-xs text-secondary-400">Memuat data dokumen...</p>
                      </Show>
                      <For each={mergedDocs()}>
                        {({ req, uploaded, latest }: any) => {
                          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                          const isMissing = !latest;
                          const isRejected = latest && !latest.isVerified && latest.rejectionNote;
                          return (
                            <div
                              class={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                                isMissing
                                  ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800'
                                  : latest.isVerified
                                    ? 'bg-green-50 dark:bg-green-900/10'
                                    : 'bg-secondary-50 dark:bg-secondary-800/60'
                              }`}
                            >
                              <div class="flex items-center gap-2 min-w-0 flex-1">
                                <span class={`font-medium ${isMissing ? 'text-red-600' : ''}`}>
                                  {req.namaDokumen}
                                  {req.isWajib ? <span class="text-red-500 ml-0.5">*</span> : ''}
                                </span>

                                {isMissing && (
                                  <span class="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">
                                    BELUM DIUPLOAD
                                  </span>
                                )}
                                {latest && !latest.isVerified && !latest.rejectionNote && (
                                  <span class="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                                    Menunggu
                                  </span>
                                )}
                                {latest && latest.isVerified && (
                                  <span class="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">
                                    Terverifikasi
                                  </span>
                                )}
                                {latest && isRejected && (
                                  <span class="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full">
                                    Ditolak
                                  </span>
                                )}
                              </div>

                              <div class="flex items-center gap-2 ml-2 flex-shrink-0">
                                {/* Admin upload button */}
                                <button
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.jpg,.jpeg,.png,.pdf';
                                    input.onchange = async () => {
                                      const f = input.files?.[0];
                                      if (!f) return;
                                      setUploadingReq(req.id);
                                      const fd = new FormData();
                                      fd.append('file', f);
                                      fd.append('requirementId', String(req.id));
                                      try {
                                        await admisiAdminController.adminUploadDocument(app.id, fd);
                                        toast.showToast('Dokumen diupload admin', 'success');
                                        await loadDocs(app);
                                      } catch (err: unknown) {
                                        toast.showToast((err as Error).message, 'error');
                                      } finally {
                                        setUploadingReq(null);
                                      }
                                    };
                                    input.click();
                                  }}
                                  class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                >
                                  {uploadingReq() === req.id ? '...' : '📤'}
                                </button>

                                {latest && (
                                  <div class="flex items-center gap-1">
                                    {latest.fileLink ? (
                                      <a
                                        href={latest.fileLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="text-xs text-brand-600 hover:underline"
                                      >
                                        🔗
                                      </a>
                                    ) : (
                                      <a
                                        href={`${apiUrl}/admisi/documents/${latest.id}/file`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="text-xs text-brand-600 hover:underline"
                                      >
                                        📄
                                      </a>
                                    )}
                                    {!latest.isVerified && (
                                      <>
                                        <button
                                          onClick={() => handleVerify(latest.id, true)}
                                          class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={() => {
                                            const note = prompt('Alasan penolakan:');
                                            if (note) handleVerify(latest.id, false, note);
                                          }}
                                          class="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                        >
                                          ✗
                                        </button>
                                      </>
                                    )}
                                    {latest.isVerified && (
                                      <button
                                        onClick={() => {
                                          if (confirm('Batalkan verifikasi dokumen ini?'))
                                            handleVerify(latest.id, false, 'Verifikasi dibatalkan admin');
                                        }}
                                        class="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                      >
                                        Batalkan
                                      </button>
                                    )}
                                  </div>
                                )}
                                {isRejected && <span class="text-xs text-red-500">{latest.rejectionNote}</span>}
                              </div>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>

        <Show when={!apps.loading && (!apps()?.data || apps()!.data.length === 0)}>
          <div class="text-center py-12 text-secondary-400 bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl">
            Tidak ada pendaftar dengan filter saat ini.
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
