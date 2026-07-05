import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { kelasKuliahController } from '../controllers/kelasKuliahController';
import { Krs as IKrs, krsController } from '../controllers/krsController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';

export default function Krs() {
  const auth = useAuth();
  const toast = useToast();
  const workspace = useWorkspace();
  const role = () => auth.user()?.role;
  const userEmail = () => auth.user()?.email;

  const [showImportModal, setShowImportModal] = createSignal(false);

  const [activeTab, setActiveTab] = createSignal<'kelola' | 'massal'>('kelola');
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedMhsIds, setSelectedMhsIds] = createSignal<number[]>([]);

  // Load all academic periods
  const [periodes] = createResource(async () => {
    try {
      const res = await periodeAkademikController.getAll(undefined, 1, 100);
      return res.data;
    } catch (e) {
      return [];
    }
  });

  createEffect(() => {
    const wsPeriode = workspace.selectedPeriodeId();
    if (wsPeriode) {
      setSelectedPeriode(wsPeriode);
      return;
    }
    const list = periodes();
    if (list && list.length > 0) {
      const active = list.find((p) => p.aktif);
      if (active) {
        setSelectedPeriode(active.id);
      } else {
        setSelectedPeriode(list[0].id);
      }
    }
  });

  // Fetch pending students for batch approval
  const [pendingStudents, { refetch: refetchPending }] = createResource(
    () => ({
      periodeId: selectedPeriode(),
      tab: activeTab(),
      role: role(),
    }),
    async ({ periodeId, tab, role }) => {
      if (role === 'mahasiswa' || tab !== 'massal' || !periodeId) return [];
      try {
        return await krsController.getPendingStudents(periodeId);
      } catch (e: any) {
        toast.showToast(e.message || 'Gagal memuat mahasiswa pending', 'error');
        return [];
      }
    },
  );

  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);

  // Load Mahasiswa profile if current user is Mahasiswa
  const [mahasiswaProfile] = createResource(
    () => {
      if (role() === 'mahasiswa') return userEmail();
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await mahasiswaController.getAll(email, 1, 1);
      return res.data[0] || null;
    },
  );

  // Fetch KRS data (filtered dynamically)
  const [krsData, { refetch }] = createResource(
    () => ({
      search: role() === 'mahasiswa' ? mahasiswaProfile()?.nim || '' : search(),
      page: page(),
      limit: limit(),
      mhsLoaded: role() === 'mahasiswa' ? !!mahasiswaProfile() : true,
    }),
    async ({ search, page, limit, mhsLoaded }) => {
      if (!mhsLoaded) return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } };
      try {
        return await krsController.getAll(search, page, limit);
      } catch (e: any) {
        toast.showToast(e.message || 'Gagal memuat data KRS', 'error');
        throw e;
      }
    },
  );

  // Fetch All Kelas & Mahasiswa for Forms
  const [kelasOptions] = createResource(() => kelasKuliahController.getAll(undefined, 1, 100));
  const [mahasiswaOptions] = createResource(() => {
    if (role() !== 'mahasiswa') return mahasiswaController.getAll(undefined, 1, 100);
    return null;
  });

  // Modal Form State
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [showGradeModal, setShowGradeModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);

  // Create Form State
  const [mhsId, setMhsId] = createSignal<number>(0);
  const [kelasId, setKelasId] = createSignal<number>(0);

  // Grade Form State
  const [nilaiAngka, setNilaiAngka] = createSignal('');
  const [nilaiHuruf, setNilaiHuruf] = createSignal('');
  const [nilaiIndeks, setNilaiIndeks] = createSignal('');

  const [errorMsg, setErrorMsg] = createSignal('');

  const openAddModal = () => {
    setErrorMsg('');
    if (role() === 'mahasiswa') {
      if (!mahasiswaProfile()) {
        alert('Data profile mahasiswa belum dimuat.');
        return;
      }
      if (mahasiswaProfile()?.status !== 'aktif') {
        alert('Status Anda tidak Aktif. Anda tidak dapat melakukan pengisian KRS.');
        return;
      }
      setMhsId(mahasiswaProfile()!.id);
    } else {
      const firstMhs = mahasiswaOptions()?.data?.[0]?.id || 0;
      setMhsId(firstMhs);
    }
    const firstKelas = kelasOptions()?.data?.[0]?.id || 0;
    setKelasId(firstKelas);
    setShowAddModal(true);
  };

  const openGradeModal = (item: IKrs) => {
    setErrorMsg('');
    setEditId(item.id);
    setNilaiAngka(item.nilaiAngka ? String(item.nilaiAngka) : '');
    setNilaiHuruf(item.nilaiHuruf || '');
    setNilaiIndeks(item.nilaiIndeks ? String(item.nilaiIndeks) : '');
    setShowGradeModal(true);
  };

  const handleAddKrs = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await krsController.create({
        mahasiswaId: Number(mhsId()),
        kelasKuliahId: Number(kelasId()),
      });
      setShowAddModal(false);
      toast.showToast('KRS berhasil dikontrak', 'success');
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menambahkan KRS');
      toast.showToast(e.message || 'Gagal menambahkan KRS', 'error');
    }
  };

  const handleInputGrade = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await krsController.update(editId()!, {
        nilaiAngka: nilaiAngka() ? Number(nilaiAngka()) : undefined,
        nilaiHuruf: nilaiHuruf() || undefined,
        nilaiIndeks: nilaiIndeks() ? Number(nilaiIndeks()) : undefined,
      });
      setShowGradeModal(false);
      toast.showToast('Nilai berhasil disimpan', 'success');
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal memperbarui nilai');
      toast.showToast(e.message || 'Gagal memperbarui nilai', 'error');
    }
  };

  const handleApproveAll = async () => {
    if (!confirm('Apakah Anda yakin ingin menyetujui seluruh KRS pending untuk semua mahasiswa di periode ini?'))
      return;

    try {
      await krsController.approve(null as any, selectedPeriode() || '20252');
      toast.showToast('Seluruh KRS pending berhasil disetujui', 'success');
      refetch();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menyetujui KRS', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan/menghapus KRS ini?')) return;
    try {
      await krsController.delete(id);
      toast.showToast('KRS berhasil dihapus/dibatalkan', 'success');
      refetch();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menghapus KRS', 'error');
    }
  };

  const handleApproveBatch = async () => {
    const ids = selectedMhsIds();
    if (ids.length === 0) {
      toast.showToast('Silakan pilih setidaknya satu mahasiswa.', 'error');
      return;
    }
    const periodeId = selectedPeriode();
    if (!periodeId) {
      toast.showToast('Periode akademik tidak terpilih.', 'error');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menyetujui KRS untuk ${ids.length} mahasiswa terpilih?`)) return;

    try {
      await krsController.approveBatch(ids, periodeId);
      toast.showToast('KRS untuk mahasiswa terpilih berhasil disetujui.', 'success');
      setSelectedMhsIds([]);
      refetchPending();
      refetch();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menyetujui KRS secara massal.', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-800">Kartu Rencana Studi (KRS)</h1>
            <p class="text-sm text-gray-500">
              {role() === 'mahasiswa'
                ? 'Daftar rencana studi semester aktif yang Anda kontrak.'
                : 'Kelola pendaftaran kontrak rencana studi dan input nilai indeks mahasiswa.'}
            </p>
          </div>
          <div class="flex gap-2">
            <Show when={role() === 'admin'}>
              <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                📥 Impor KRS
              </Button>
            </Show>
            <Button disabled={role() === 'mahasiswa' && mahasiswaProfile()?.status !== 'aktif'} onClick={openAddModal}>
              + Tambah Kontrak KRS
            </Button>
          </div>
        </div>

        {/* Warning Banner if Mahasiswa is not active */}
        <Show when={role() === 'mahasiswa' && mahasiswaProfile() && mahasiswaProfile()?.status !== 'aktif'}>
          <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold shadow-sm flex items-start gap-3">
            <span class="text-base">⚠️</span>
            <div>
              <p class="font-bold">Status Registrasi: Tidak Aktif (SPP/UKT Belum Lunas)</p>
              <p class="text-xs text-red-500 font-medium mt-1">
                Anda tidak diperbolehkan mengontrak KRS sebelum tagihan SPP dilunasi dan status diaktifkan kembali oleh
                bagian Keuangan.
              </p>
            </div>
          </div>
        </Show>

        {/* Dosen PA Batch Approval Banner */}
        <Show
          when={
            (role() === 'dosen' || role() === 'admin') &&
            krsData()?.data &&
            krsData()!.data.length > 0 &&
            krsData()!.data.some((k) => !k.isApproved)
          }
        >
          <div class="p-4 bg-yellow-50 border border-yellow-100 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <div>
              <h4 class="text-sm font-bold text-yellow-800">KRS Mahasiswa Menunggu Persetujuan</h4>
              <p class="text-xs text-yellow-600 font-medium mt-0.5">
                Terdapat beberapa kontrak KRS pending pada periode ini.
              </p>
            </div>
            <Button variant="primary" onClick={handleApproveAll} class="!py-1.5 !px-4 text-xs">
              Setujui Semua KRS
            </Button>
          </div>
        </Show>

        {/* Tab Switcher (Only for admin and dosen) */}
        <Show when={role() === 'admin' || role() === 'dosen'}>
          <div class="flex gap-2 border-b border-gray-100 pb-3">
            <button
              onClick={() => setActiveTab('kelola')}
              class={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab() === 'kelola'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-150'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Kelola KRS
            </button>
            <button
              onClick={() => setActiveTab('massal')}
              class={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab() === 'massal'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-150'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Persetujuan Massal KRS
            </button>
          </div>
        </Show>

        <Show when={activeTab() === 'kelola' || role() === 'mahasiswa'}>
          {/* Search Filter for Admins / Dosen */}
          <Show when={role() !== 'mahasiswa'}>
            <div class="max-w-xs">
              <Input
                placeholder="Cari NIM atau Nama..."
                value={search()}
                onInput={(e) => {
                  setSearch(e.currentTarget.value);
                  setPage(1);
                }}
              />
            </div>
          </Show>

          <Show when={!krsData.loading} fallback={<div class="text-center py-10 text-gray-400">Loading data...</div>}>
            <Table
              headers={[
                'Mahasiswa',
                'Kelas Kuliah',
                'Periode',
                'Nilai Angka',
                'Nilai Huruf',
                'Nilai Indeks',
                'Status',
                'Aksi',
              ]}
            >
              <For each={krsData()?.data}>
                {(item) => (
                  <tr class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-6 py-4">
                      <div class="font-medium text-gray-800">{item.mahasiswa?.nama}</div>
                      <div class="text-xs text-gray-400 font-mono">{item.mahasiswa?.nim}</div>
                    </td>
                    <td class="px-6 py-4 text-gray-700">{item.kelasKuliah?.namaKelas}</td>
                    <td class="px-6 py-4 text-gray-500 font-mono text-xs">{item.kelasKuliah?.periodeId}</td>
                    <td class="px-6 py-4 font-mono font-semibold">{item.nilaiAngka || '-'}</td>
                    <td class="px-6 py-4 font-bold text-blue-600">{item.nilaiHuruf || '-'}</td>
                    <td class="px-6 py-4 font-mono">{item.nilaiIndeks || '-'}</td>
                    <td class="px-6 py-4">
                      <span
                        class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.isApproved
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}
                      >
                        {item.isApproved ? 'Disetujui' : 'Pending'}
                      </span>
                    </td>
                    <td class="px-6 py-4 flex gap-2">
                      <Show when={role() !== 'mahasiswa'}>
                        <Button variant="secondary" onClick={() => openGradeModal(item)} class="!py-1 !px-2.5 text-xs">
                          Input Nilai
                        </Button>
                      </Show>
                      <Button variant="danger" onClick={() => handleDelete(item.id)} class="!py-1 !px-2.5 text-xs">
                        Batal
                      </Button>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={krsData()?.data.length === 0}>
                <tr>
                  <td colspan="8" class="px-6 py-10 text-center text-gray-400">
                    Tidak ada kontrak KRS ditemukan.
                  </td>
                </tr>
              </Show>
            </Table>

            {/* Pagination */}
            <Show when={krsData() && krsData()!.meta.totalPages > 1}>
              <div class="flex justify-between items-center mt-4">
                <span class="text-xs text-gray-500">
                  Menampilkan halaman {page()} dari {krsData()?.meta.totalPages} ({krsData()?.meta.total} total data)
                </span>
                <div class="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page() === 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    class="!py-1 !px-3"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page() >= krsData()!.meta.totalPages}
                    onClick={() => setPage((p) => Math.min(p + 1, krsData()!.meta.totalPages))}
                    class="!py-1 !px-3"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </Show>
          </Show>
        </Show>

        <Show when={activeTab() === 'massal' && role() !== 'mahasiswa'}>
          <div class="flex justify-between items-center gap-4 bg-white/60 p-6 rounded-2xl border border-gray-100 shadow-sm mb-4">
            <div>
              <h3 class="font-bold text-gray-800">Daftar Mahasiswa dengan KRS Pending</h3>
              <p class="text-xs text-gray-400 mt-0.5">
                Pilih satu atau beberapa mahasiswa untuk disetujui KRS-nya sekaligus.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleApproveBatch}
              disabled={selectedMhsIds().length === 0}
              class="shadow-sm shadow-blue-150"
            >
              🔓 Setujui KRS Terpilih ({selectedMhsIds().length})
            </Button>
          </div>

          <Show
            when={!pendingStudents.loading}
            fallback={<div class="text-center py-10 text-gray-400">Loading data...</div>}
          >
            <Table headers={['Pilih', 'NIM', 'Nama Mahasiswa', 'Email', 'Status']}>
              <For
                each={pendingStudents()}
                fallback={
                  <tr>
                    <td colspan="5" class="px-6 py-10 text-center text-gray-400 italic">
                      Tidak ada mahasiswa dengan kontrak KRS pending di periode ini.
                    </td>
                  </tr>
                }
              >
                {(student) => {
                  const isChecked = () => selectedMhsIds().includes(student.id);
                  const toggleCheck = () => {
                    if (isChecked()) {
                      setSelectedMhsIds(selectedMhsIds().filter((id) => id !== student.id));
                    } else {
                      setSelectedMhsIds([...selectedMhsIds(), student.id]);
                    }
                  };
                  return (
                    <tr class="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={toggleCheck}>
                      <td class="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked()}
                          onChange={toggleCheck}
                          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td class="px-6 py-4 font-mono text-gray-700">{student.nim}</td>
                      <td class="px-6 py-4 font-bold text-gray-900">{student.nama}</td>
                      <td class="px-6 py-4 text-gray-500">{student.email}</td>
                      <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
                          Pending
                        </span>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </Table>
          </Show>
        </Show>

        {/* Modal Add KRS */}
        <Modal show={showAddModal()} title="Tambah Kontrak KRS" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddKrs} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg()}
              </div>
            </Show>

            <Show
              when={role() === 'mahasiswa'}
              fallback={
                <Input
                  isSelect
                  label="Mahasiswa"
                  value={mhsId()}
                  onChange={(e) => setMhsId(Number(e.currentTarget.value))}
                  selectOptions={
                    mahasiswaOptions()?.data.map((m) => ({ label: `${m.nim} - ${m.nama}`, value: m.id })) || []
                  }
                />
              }
            >
              <div class="flex flex-col gap-1.5 w-full">
                <label class="text-xs font-semibold uppercase tracking-wider text-gray-500">Mahasiswa</label>
                <div class="px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm font-semibold text-gray-800">
                  {mahasiswaProfile()?.nim} - {mahasiswaProfile()?.nama}
                </div>
              </div>
            </Show>

            <Input
              isSelect
              label="Kelas Kuliah Pilihan"
              value={kelasId()}
              onChange={(e) => setKelasId(Number(e.currentTarget.value))}
              selectOptions={
                kelasOptions()?.data.map((k) => ({
                  label: `Kelas ${k.namaKelas} (Mata Kuliah: ${k.mataKuliah?.nama || k.mataKuliahId})`,
                  value: k.id,
                })) || []
              }
            />

            <div class="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                Batal
              </Button>
              <Button type="submit">Kontrak Kelas</Button>
            </div>
          </form>
        </Modal>

        {/* Modal Grade Input */}
        <Modal show={showGradeModal()} title="Input Nilai Akademik" onClose={() => setShowGradeModal(false)}>
          <form onSubmit={handleInputGrade} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg()}
              </div>
            </Show>

            <Input
              type="number"
              step="0.01"
              label="Nilai Angka"
              value={nilaiAngka()}
              onInput={(e) => setNilaiAngka(e.currentTarget.value)}
              placeholder="Contoh: 85.50"
            />
            <Input
              label="Nilai Huruf"
              value={nilaiHuruf()}
              onInput={(e) => setNilaiHuruf(e.currentTarget.value)}
              placeholder="Contoh: A, B+, C"
            />
            <Input
              type="number"
              step="0.01"
              label="Nilai Indeks"
              value={nilaiIndeks()}
              onInput={(e) => setNilaiIndeks(e.currentTarget.value)}
              placeholder="Contoh: 4.00, 3.50"
            />

            <div class="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowGradeModal(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan Nilai</Button>
            </div>
          </form>
        </Modal>

        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          importUrl="/krs/import"
          templateHeaders={['nim', 'kode_mata_kuliah', 'nama_kelas', 'periode_id']}
          title="KRS"
          onSuccess={() => {
            refetch();
            refetchPending();
          }}
        />
      </div>
    </MainLayout>
  );
}
