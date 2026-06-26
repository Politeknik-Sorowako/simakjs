import { createSignal, createResource, Show, For } from 'solid-js';
import { krsController, Krs as IKrs } from '../controllers/krsController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { kelasKuliahController } from '../controllers/kelasKuliahController';
import { useAuth } from '../contexts/AuthContext';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';

export default function Krs() {
  const auth = useAuth();
  const toast = useToast();
  const role = () => auth.user()?.role;
  const userEmail = () => auth.user()?.email;

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
    }
  );

  // Fetch KRS data (filtered dynamically)
  const [krsData, { refetch }] = createResource(
    () => ({
      search: role() === 'mahasiswa' ? (mahasiswaProfile()?.nim || '') : search(),
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
    }
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
    const firstItem = krsData()?.data?.[0];
    if (!firstItem) return;
    if (!confirm(`Apakah Anda yakin ingin menyetujui seluruh KRS untuk mahasiswa ${firstItem.mahasiswa?.nama}?`)) return;

    try {
      await krsController.approve(firstItem.mahasiswaId, firstItem.kelasKuliah?.periodeId || '20231');
      toast.showToast('KRS mahasiswa berhasil disetujui', 'success');
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
          <Button
            disabled={role() === 'mahasiswa' && mahasiswaProfile()?.status !== 'aktif'}
            onClick={openAddModal}
          >
            + Tambah Kontrak KRS
          </Button>
        </div>

        {/* Warning Banner if Mahasiswa is not active */}
        <Show when={role() === 'mahasiswa' && mahasiswaProfile() && mahasiswaProfile()?.status !== 'aktif'}>
          <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold shadow-sm flex items-start gap-3">
            <span class="text-base">⚠️</span>
            <div>
              <p class="font-bold">Status Registrasi: Tidak Aktif (SPP/UKT Belum Lunas)</p>
              <p class="text-xs text-red-500 font-medium mt-1">Anda tidak diperbolehkan mengontrak KRS sebelum tagihan SPP dilunasi dan status diaktifkan kembali oleh bagian Keuangan.</p>
            </div>
          </div>
        </Show>

        {/* Dosen PA Batch Approval Banner */}
        <Show when={(role() === 'dosen' || role() === 'admin') && krsData()?.data && krsData()!.data.length > 0 && krsData()!.data.some(k => !k.isApproved)}>
          <div class="p-4 bg-yellow-50 border border-yellow-100 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <div>
              <h4 class="text-sm font-bold text-yellow-800">KRS Mahasiswa Menunggu Persetujuan</h4>
              <p class="text-xs text-yellow-600 font-medium mt-0.5">Terdapat beberapa kontrak KRS pending untuk mahasiswa {krsData()?.data?.[0]?.mahasiswa?.nama || 'ini'}.</p>
            </div>
            <Button variant="primary" onClick={handleApproveAll} class="!py-1.5 !px-4 text-xs">
              Setujui Semua KRS
            </Button>
          </div>
        </Show>

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
          <Table headers={['Mahasiswa', 'Kelas Kuliah', 'Periode', 'Nilai Angka', 'Nilai Huruf', 'Nilai Indeks', 'Status', 'Aksi']}>
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
                kelasOptions()?.data.map((k) => ({ label: `Kelas ${k.namaKelas} (Mata Kuliah: ${k.mataKuliah?.nama || k.mataKuliahId})`, value: k.id })) || []
              }
            />

            <div class="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                Batal
              </Button>
              <Button type="submit">
                Kontrak Kelas
              </Button>
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
              <Button type="submit">
                Simpan Nilai
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
