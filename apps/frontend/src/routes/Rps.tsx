import { createSignal, createResource, Show, For } from 'solid-js';
import { rpsController, Rps as IRps, RpsTopik, RencanaEvaluasi } from '../controllers/rpsController';
import { mataKuliahController } from '../controllers/mataKuliahController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';

export default function Rps() {
  const [selectedMk, setSelectedMk] = createSignal<number>(0);
  const [selectedPeriode, setSelectedPeriode] = createSignal<string>('');

  // Dropdown options
  const [matkuls] = createResource(() => mataKuliahController.getAll(undefined, 1, 100));
  const [periodes] = createResource(() => periodeAkademikController.getAll());

  // RPS Header & Topik
  const [rps, { refetch: refetchRps }] = createResource(
    () => ({ mkId: selectedMk(), periodeId: selectedPeriode() }),
    ({ mkId, periodeId }) => {
      if (!mkId || !periodeId) return Promise.resolve(null);
      return rpsController.getRps(mkId, periodeId);
    }
  );

  // Rencana Evaluasi
  const [rencanaEvals, { refetch: refetchEvals }] = createResource(
    () => selectedMk(),
    (mkId) => {
      if (!mkId) return Promise.resolve([]);
      return rpsController.getRencanaEvaluasi(mkId);
    }
  );

  // Form signal for Topik
  const [showTopikModal, setShowTopikModal] = createSignal(false);
  const [editTopikId, setEditTopikId] = createSignal<number | null>(null);
  const [pertemuanKe, setPertemuanKe] = createSignal(1);
  const [topikText, setTopikText] = createSignal('');
  const [subTopik, setSubTopik] = createSignal('');
  const [metode, setMetode] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');

  // Form signal for RPS Header
  const [showRpsModal, setShowRpsModal] = createSignal(false);
  const [deskripsi, setDeskripsi] = createSignal('');
  const [cplProdi, setCplProdi] = createSignal('');

  // Form signal for Rencana Evaluasi
  const [showEvalModal, setShowEvalModal] = createSignal(false);
  const [editEvalId, setEditEvalId] = createSignal<number | null>(null);
  const [namaEvaluasi, setNamaEvaluasi] = createSignal('');
  const [bobotEvaluasi, setBobotEvaluasi] = createSignal(10);
  const [evalDeskripsi, setEvalDeskripsi] = createSignal('');

  const handleCreateRps = async () => {
    try {
      await rpsController.createRps({
        mataKuliahId: selectedMk(),
        periodeId: selectedPeriode(),
        deskripsi: '',
        cplProdi: '',
      });
      refetchRps();
    } catch (e: any) {
      alert(e.message || 'Gagal membuat RPS');
    }
  };

  const handleSaveRpsHeader = async (e: Event) => {
    e.preventDefault();
    if (!rps()) return;
    try {
      await rpsController.updateRps(rps()!.id, {
        deskripsi: deskripsi(),
        cplProdi: cplProdi(),
      });
      setShowRpsModal(false);
      refetchRps();
    } catch (e: any) {
      alert(e.message || 'Gagal memperbarui RPS');
    }
  };

  const openEditRpsHeader = () => {
    if (!rps()) return;
    setDeskripsi(rps()!.deskripsi || '');
    setCplProdi(rps()!.cplProdi || '');
    setShowRpsModal(true);
  };

  const openAddTopik = () => {
    setEditTopikId(null);
    setPertemuanKe((rps()?.topik?.length || 0) + 1);
    setTopikText('');
    setSubTopik('');
    setMetode('Ceramah & Diskusi');
    setErrorMsg('');
    setShowTopikModal(true);
  };

  const openEditTopik = (topik: RpsTopik) => {
    setEditTopikId(topik.id);
    setPertemuanKe(topik.pertemuanKe);
    setTopikText(topik.topik);
    setSubTopik(topik.subTopik || '');
    setMetode(topik.metode || '');
    setErrorMsg('');
    setShowTopikModal(true);
  };

  const handleSaveTopik = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        pertemuanKe: Number(pertemuanKe()),
        topik: topikText(),
        subTopik: subTopik(),
        metode: metode(),
      };

      if (editTopikId()) {
        await rpsController.updateTopik(editTopikId()!, payload);
      } else {
        await rpsController.addTopik(rps()!.id, payload);
      }
      setShowTopikModal(false);
      refetchRps();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menyimpan topik');
    }
  };

  const handleDeleteTopik = async (id: number) => {
    if (!confirm('Hapus topik pertemuan ini?')) return;
    try {
      await rpsController.deleteTopik(id);
      refetchRps();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus topik');
    }
  };

  const openAddEval = () => {
    setEditEvalId(null);
    setNamaEvaluasi('');
    setBobotEvaluasi(10);
    setEvalDeskripsi('');
    setErrorMsg('');
    setShowEvalModal(true);
  };

  const openEditEval = (item: RencanaEvaluasi) => {
    setEditEvalId(item.id);
    setNamaEvaluasi(item.namaEvaluasi);
    setBobotEvaluasi(Number(item.bobotEvaluasi));
    setEvalDeskripsi(item.deskripsi || '');
    setErrorMsg('');
    setShowEvalModal(true);
  };

  const handleSaveEval = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        mataKuliahId: selectedMk(),
        namaEvaluasi: namaEvaluasi(),
        bobotEvaluasi: Number(bobotEvaluasi()),
        deskripsi: evalDeskripsi(),
      };

      if (editEvalId()) {
        await rpsController.updateRencanaEvaluasi(editEvalId()!, payload);
      } else {
        await rpsController.createRencanaEvaluasi(payload);
      }
      setShowEvalModal(false);
      refetchEvals();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menyimpan rencana evaluasi');
    }
  };

  const handleDeleteEval = async (id: number) => {
    if (!confirm('Hapus rencana evaluasi ini?')) return;
    try {
      await rpsController.deleteRencanaEvaluasi(id);
      refetchEvals();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus rencana evaluasi');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-extrabold text-gray-800 dark:text-white">Rencana Pembelajaran Semester (RPS)</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Kelola rencana ajar mingguan dan metode evaluasi penilaian mata kuliah</p>
        </div>

        {/* Filter Selection */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-gray-500">Mata Kuliah</label>
            <select
              class="h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setSelectedMk(Number(e.currentTarget.value))}
            >
              <option value="0">-- Pilih Mata Kuliah --</option>
              <For each={matkuls()?.data}>
                {(mk) => <option value={mk.id}>{mk.kode} - {mk.nama}</option>}
              </For>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-gray-500">Periode Akademik</label>
            <select
              class="h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
            >
              <option value="">-- Pilih Periode --</option>
              <For each={periodes()?.data}>
                {(p) => <option value={p.id}>{p.nama}</option>}
              </For>
            </select>
          </div>
        </div>

        {/* Main Content Area */}
        <Show when={selectedMk() > 0 && selectedPeriode() !== ''}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* RPS Header and Topics */}
            <div class="lg:col-span-2 flex flex-col gap-6">
              <div class="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col gap-4">
                <div class="flex justify-between items-start border-b border-gray-100 dark:border-slate-800 pb-4">
                  <h2 class="text-lg font-bold text-gray-800 dark:text-white">Deskripsi & CPL</h2>
                  <Show when={rps()}>
                    <Button variant="secondary" onClick={openEditRpsHeader}>Edit Deskripsi</Button>
                  </Show>
                </div>
                <Show when={!rps()}>
                  <div class="p-6 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-lg">
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">RPS belum disusun untuk mata kuliah & periode ini.</p>
                    <Button onClick={handleCreateRps}>Buat RPS Baru</Button>
                  </div>
                </Show>
                <Show when={rps()}>
                  <div>
                    <h3 class="text-sm font-semibold text-gray-500">Deskripsi Mata Kuliah</h3>
                    <p class="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">{rps()?.deskripsi || 'Belum diisi.'}</p>
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-gray-500">Capaian Pembelajaran Lulusan (CPL)</h3>
                    <p class="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">{rps()?.cplProdi || 'Belum diisi.'}</p>
                  </div>
                </Show>
              </div>

              {/* Topics (16 Pertemuan) */}
              <Show when={rps()}>
                <div class="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col gap-4">
                  <div class="flex justify-between items-center">
                    <h2 class="text-lg font-bold text-gray-800 dark:text-white">Rencana Pertemuan Mingguan (Ajar)</h2>
                    <Button onClick={openAddTopik}>+ Tambah Pertemuan</Button>
                  </div>
                  <Table headers={['Mng', 'Topik Pembahasan', 'Metode', 'Aksi']}>
                    <Show when={!rps()?.topik || rps()?.topik?.length === 0}>
                      <tr>
                        <td colspan="4" class="p-6 text-center text-gray-500">Belum ada topik pertemuan yang ditambahkan.</td>
                      </tr>
                    </Show>
                    <For each={rps()?.topik?.sort((a, b) => a.pertemuanKe - b.pertemuanKe)}>
                      {(t) => (
                        <tr class="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <td class="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">#{t.pertemuanKe}</td>
                          <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                            <div class="font-medium">{t.topik}</div>
                            <Show when={t.subTopik}>
                              <div class="text-xs text-gray-500 mt-0.5">{t.subTopik}</div>
                            </Show>
                          </td>
                          <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{t.metode || '-'}</td>
                          <td class="px-6 py-4 text-sm space-x-1">
                            <Button variant="secondary" onClick={() => openEditTopik(t)}>Edit</Button>
                            <Button variant="danger" onClick={() => handleDeleteTopik(t.id)}>Hapus</Button>
                          </td>
                        </tr>
                      )}
                    </For>
                  </Table>
                </div>
              </Show>
            </div>

            {/* Rencana Evaluasi (Assessment Plan) */}
            <div class="flex flex-col gap-6">
              <div class="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col gap-4">
                <div class="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4">
                  <h2 class="text-lg font-bold text-gray-800 dark:text-white">Rencana Evaluasi (Penilaian)</h2>
                  <Button onClick={openAddEval}>+ Tambah</Button>
                </div>
                <div class="flex flex-col gap-3">
                  <Show when={rencanaEvals()?.length === 0}>
                    <p class="text-sm text-gray-500 text-center py-6">Belum ada komponen penilaian evaluasi.</p>
                  </Show>
                  <For each={rencanaEvals()}>
                    {(item) => (
                      <div class="p-3 border border-gray-100 dark:border-slate-800 rounded-lg flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/30">
                        <div>
                          <div class="font-semibold text-sm text-gray-800 dark:text-white">{item.namaEvaluasi} ({item.bobotEvaluasi}%)</div>
                          <Show when={item.deskripsi}>
                            <div class="text-xs text-gray-500 mt-1">{item.deskripsi}</div>
                          </Show>
                        </div>
                        <div class="flex gap-1 ml-2">
                          <Button variant="secondary" onClick={() => openEditEval(item)}>Edit</Button>
                          <Button variant="danger" onClick={() => handleDeleteEval(item.id)}>Hapus</Button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>

          </div>
        </Show>

        {/* Modal RPS Header */}
        <Modal show={showRpsModal()} onClose={() => setShowRpsModal(false)} title="Edit Deskripsi RPS">
          <form onSubmit={handleSaveRpsHeader} class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Deskripsi Mata Kuliah</label>
              <textarea
                rows="4"
                class="w-full p-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={deskripsi()}
                onInput={(e) => setDeskripsi(e.currentTarget.value)}
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Capaian Pembelajaran Lulusan (CPL)</label>
              <textarea
                rows="4"
                class="w-full p-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={cplProdi()}
                onInput={(e) => setCplProdi(e.currentTarget.value)}
              />
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowRpsModal(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>

        {/* Modal Topik */}
        <Modal show={showTopikModal()} onClose={() => setShowTopikModal(false)} title={editTopikId() ? 'Edit Topik Pertemuan' : 'Tambah Topik Pertemuan'}>
          <form onSubmit={handleSaveTopik} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errorMsg()}</div>
            </Show>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Pertemuan Ke</label>
              <Input type="number" min="1" max="16" value={pertemuanKe()} onInput={(e) => setPertemuanKe(Number(e.currentTarget.value))} required />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Topik Utama</label>
              <Input type="text" value={topikText()} onInput={(e) => setTopikText(e.currentTarget.value)} required />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Sub-Topik / Materi (Opsional)</label>
              <Input type="text" value={subTopik()} onInput={(e) => setSubTopik(e.currentTarget.value)} />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Metode Pembelajaran</label>
              <Input type="text" value={metode()} onInput={(e) => setMetode(e.currentTarget.value)} />
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowTopikModal(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>

        {/* Modal Rencana Evaluasi */}
        <Modal show={showEvalModal()} onClose={() => setShowEvalModal(false)} title={editEvalId() ? 'Edit Rencana Evaluasi' : 'Tambah Rencana Evaluasi'}>
          <form onSubmit={handleSaveEval} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errorMsg()}</div>
            </Show>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Nama Evaluasi</label>
              <Input type="text" placeholder="Contoh: UTS, UAS, Tugas Besar" value={namaEvaluasi()} onInput={(e) => setNamaEvaluasi(e.currentTarget.value)} required />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Bobot Penilaian (%)</label>
              <Input type="number" min="1" max="100" value={bobotEvaluasi()} onInput={(e) => setBobotEvaluasi(Number(e.currentTarget.value))} required />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Deskripsi / Indikator (Opsional)</label>
              <textarea
                rows="3"
                class="w-full p-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={evalDeskripsi()}
                onInput={(e) => setEvalDeskripsi(e.currentTarget.value)}
              />
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowEvalModal(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
