import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { bimbinganController, Pelanggaran as IPelanggaran } from '../controllers/bimbinganController';
import { mahasiswaController } from '../controllers/mahasiswaController';

export default function Pelanggaran() {
  const auth = useAuth();
  const user = () => auth.user();

  // Student Profile (if logged in as student)
  const [mhsProfile] = createResource(
    () => {
      if (user()?.role === 'mahasiswa') return user()?.email;
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await mahasiswaController.getAll(email, 1, 1);
      return res.data[0] || null;
    },
  );

  // Load student's own violations
  const [studentViolations, { refetch: refetchStudentViolations }] = createResource(
    () => mhsProfile()?.id,
    async (id) => {
      if (!id) return null;
      return await bimbinganController.getPelanggaranByMhsId(id);
    },
  );

  // Load all violations (for Admin/Dosen)
  const [allViolations, { refetch: refetchAllViolations }] = createResource(
    () => {
      if (user()?.role === 'admin' || user()?.role === 'dosen') return true;
      return null;
    },
    async () => {
      return await bimbinganController.getAllPelanggaran();
    },
  );

  // List of all students for the form dropdown (Admin/Dosen)
  const [students] = createResource(
    () => {
      if (user()?.role === 'admin' || user()?.role === 'dosen') return true;
      return null;
    },
    async () => {
      const res = await mahasiswaController.getAll(undefined, 1, 100);
      return res.data;
    },
  );

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [mahasiswaId, setMahasiswaId] = createSignal(0);
  const [tanggal, setTanggal] = createSignal('');
  const [jenisPelanggaran, setJenisPelanggaran] = createSignal('');
  const [bobotPoin, setBobotPoin] = createSignal(0);
  const [keterangan, setKeterangan] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');
  const [editPelanggaranId, setEditPelanggaranId] = createSignal<number | null>(null);

  const openAddModal = () => {
    setEditPelanggaranId(null);
    const firstStudent = students()?.[0]?.id || 0;
    setMahasiswaId(firstStudent);
    setTanggal(new Date().toISOString().split('T')[0]);
    setJenisPelanggaran('');
    setBobotPoin(5);
    setKeterangan('');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: IPelanggaran) => {
    setEditPelanggaranId(item.id);
    setMahasiswaId(item.mahasiswaId);
    setTanggal(new Date(item.tanggal).toISOString().split('T')[0]);
    setJenisPelanggaran(item.jenisPelanggaran);
    setBobotPoin(item.bobotPoin);
    setKeterangan(item.keterangan);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!mahasiswaId() || !tanggal() || !jenisPelanggaran() || !bobotPoin() || !keterangan()) {
      setErrorMsg('Semua data wajib diisi.');
      return;
    }

    try {
      const payload = {
        mahasiswaId: mahasiswaId(),
        tanggal: tanggal(),
        jenisPelanggaran: jenisPelanggaran(),
        bobotPoin: bobotPoin(),
        keterangan: keterangan(),
      };

      const activeId = editPelanggaranId();
      if (activeId) {
        await bimbinganController.updatePelanggaran(activeId, payload);
      } else {
        await bimbinganController.createPelanggaran(payload);
      }
      setShowModal(false);
      refetchAllViolations();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data.');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header Section */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 tracking-tight dark:text-white">
              Kedisiplinan Mahasiswa
            </h1>
            <p class="text-sm text-secondary-500">Pencatatan pelanggaran indisipliner dan rekap poin kedisiplinan</p>
          </div>
          <Show when={user()?.role === 'admin' || user()?.role === 'dosen'}>
            <button
              onClick={openAddModal}
              class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-sm shadow-accent-200 dark:bg-brand-700 dark:hover:bg-brand-600"
            >
              + Catat Pelanggaran
            </button>
          </Show>
        </div>

        {/* Student View */}
        <Show when={user()?.role === 'mahasiswa'}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary Widget */}
            <div class="bg-white border border-secondary-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
              <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">Status Kedisiplinan</h3>
              <div class="flex flex-col gap-2 items-center justify-center py-6">
                <span
                  class={`text-6xl font-extrabold ${
                    (studentViolations()?.totalPoin || 0) > 25 ? 'text-rose-600 animate-pulse' : 'text-accent-600'
                  }`}
                >
                  {studentViolations.loading ? '...' : studentViolations()?.totalPoin || 0}
                </span>
                <span class="text-xs font-semibold uppercase tracking-wider text-secondary-400">
                  Total Poin Pelanggaran
                </span>
              </div>
              <div class="p-3.5 bg-secondary-50 border border-secondary-100 rounded-xl dark:bg-secondary-800 dark:border-secondary-800">
                <p class="text-[10px] text-secondary-400 leading-relaxed uppercase tracking-wider font-semibold">
                  Batas Poin Kelayakan (BPA):
                </p>
                <ul class="text-[11px] text-secondary-500 list-disc pl-4 mt-1 flex flex-col gap-0.5 font-medium">
                  <li>Total poin &gt; 25: Peringatan Keras (SP-1)</li>
                  <li>Total poin &gt; 50: Skorsing Akademik (SP-2)</li>
                  <li>Total poin &gt; 75: Drop Out / Diberhentikan (SP-3)</li>
                </ul>
              </div>
            </div>

            {/* Violation List */}
            <div class="lg:col-span-2 bg-white border border-secondary-100 rounded-2xl shadow-sm overflow-hidden p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
              <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">Riwayat Tindakan Indisipliner</h3>
              <Show
                when={studentViolations()?.pelanggaranList && studentViolations()!.pelanggaranList.length > 0}
                fallback={
                  <div class="py-12 text-center text-secondary-400 text-sm">
                    🎉 Luar biasa! Anda tidak memiliki catatan pelanggaran indisipliner semester ini.
                  </div>
                }
              >
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                        <th class="p-3">Tanggal</th>
                        <th class="p-3">Jenis Pelanggaran</th>
                        <th class="p-3">Bobot Poin</th>
                        <th class="p-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                      <For each={studentViolations()?.pelanggaranList}>
                        {(item) => (
                          <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                            <td class="p-3 whitespace-nowrap">{new Date(item.tanggal).toLocaleDateString()}</td>
                            <td class="p-3">{item.jenisPelanggaran}</td>
                            <td class="p-3">
                              <span class="px-2 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100 font-bold dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                                {item.bobotPoin} Poin
                              </span>
                            </td>
                            <td class="p-3">{item.keterangan}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Admin & Dosen View */}
        <Show when={user()?.role === 'admin' || user()?.role === 'dosen'}>
          <div class="bg-white border border-secondary-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
            <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">Daftar Pelanggaran Mahasiswa</h3>
            <Show
              when={allViolations() && allViolations()!.length > 0}
              fallback={
                <div class="py-12 text-center text-secondary-400 text-sm">
                  Belum ada catatan tindakan indisipliner terdaftar.
                </div>
              }
            >
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                      <th class="p-3">Mahasiswa</th>
                      <th class="p-3">NIM</th>
                      <th class="p-3">Program Studi</th>
                      <th class="p-3">Tanggal</th>
                      <th class="p-3">Jenis Pelanggaran</th>
                      <th class="p-3">Bobot Poin</th>
                      <th class="p-3">Keterangan</th>
                      <Show when={user()?.role === 'admin'}>
                        <th class="p-3 text-center">Aksi</th>
                      </Show>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                    <For each={allViolations()}>
                      {(item) => (
                        <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                          <td class="p-3 font-bold text-secondary-800 dark:text-white">{item.namaMahasiswa}</td>
                          <td class="p-3 whitespace-nowrap">{item.nim}</td>
                          <td class="p-3">{item.prodiNama}</td>
                          <td class="p-3 whitespace-nowrap">{new Date(item.tanggal).toLocaleDateString()}</td>
                          <td class="p-3">{item.jenisPelanggaran}</td>
                          <td class="p-3">
                            <span class="px-2 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100 font-bold dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                              {item.bobotPoin}
                            </span>
                          </td>
                          <td class="p-3">{item.keterangan}</td>
                          <Show when={user()?.role === 'admin'}>
                            <td class="p-3 text-center">
                              <Button
                                onClick={() => openEditModal(item)}
                                variant="secondary"
                                class="py-1 px-2.5 text-[10px]"
                              >
                                Edit
                              </Button>
                            </td>
                          </Show>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        </Show>

        {/* Modal Entry Pelanggaran */}
        <Modal
          show={showModal()}
          onClose={() => setShowModal(false)}
          title={editPelanggaranId() ? 'Edit Catatan Pelanggaran' : 'Catat Pelanggaran Baru'}
        >
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                {errorMsg()}
              </div>
            </Show>

            {/* Select Mahasiswa */}
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-secondary-700">Pilih Mahasiswa</label>
              <select
                value={mahasiswaId()}
                onChange={(e) => setMahasiswaId(parseInt(e.currentTarget.value))}
                class="border border-secondary-200 rounded-xl p-3 text-xs bg-white focus:outline-none focus:border-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
              >
                <For each={students()}>
                  {(item) => (
                    <option value={item.id}>
                      {item.nama} ({item.nim})
                    </option>
                  )}
                </For>
              </select>
            </div>

            {/* Tanggal */}
            <Input
              label="Tanggal Pelanggaran"
              type="date"
              value={tanggal()}
              onInput={(e) => setTanggal(e.currentTarget.value)}
            />

            {/* Jenis Pelanggaran */}
            <Input
              label="Jenis Pelanggaran"
              type="text"
              placeholder="Contoh: Terlambat Kelas Praktik, Kerusakan Fasilitas"
              value={jenisPelanggaran()}
              onInput={(e) => setJenisPelanggaran(e.currentTarget.value)}
            />

            {/* Bobot Poin */}
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-secondary-700">Bobot Pelanggaran (Poin)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={bobotPoin()}
                onInput={(e) => setBobotPoin(parseInt(e.currentTarget.value))}
                class="border border-secondary-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 dark:border-secondary-700"
              />
            </div>

            {/* Keterangan */}
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-secondary-700">Keterangan Detail</label>
              <textarea
                rows="4"
                placeholder="Tulis kronologi singkat atau rincian pelanggaran..."
                value={keterangan()}
                onInput={(e) => setKeterangan(e.currentTarget.value)}
                class="border border-secondary-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 resize-none dark:border-secondary-700"
              />
            </div>

            <div class="flex justify-end gap-3 border-t pt-4 mt-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Simpan Pelanggaran
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
