import { createSignal, createResource, Show, For } from 'solid-js';
import { kurikulumController, Kurikulum as IKurikulum } from '../controllers/kurikulumController';
import { prodiController } from '../controllers/prodiController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';

export default function Kurikulum() {
  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);

  // Fetch Kurikulum Data
  const [kurikulums, { refetch }] = createResource(
    () => ({ search: search(), page: page(), limit: limit(), prodiId: prodiFilter() }),
    ({ search, page, limit, prodiId }) => kurikulumController.getAll(search, page, limit, prodiId)
  );

  // Fetch Program Studi for Dropdown
  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  // Fetch Periode Akademik for Dropdown
  const [periodes] = createResource(() => periodeAkademikController.getAll());

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [kode, setKode] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [prodiId, setProdiId] = createSignal<number>(0);
  const [semesterMulai, setSemesterMulai] = createSignal('');
  const [jumlahSksLulus, setJumlahSksLulus] = createSignal(144);
  const [jumlahSksWajib, setJumlahSksWajib] = createSignal(120);
  const [jumlahSksPilihan, setJumlahSksPilihan] = createSignal(24);
  const [isAktif, setIsAktif] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');

  const openAddModal = () => {
    setEditId(null);
    setKode('');
    setNama('');
    const firstProdi = prodis()?.data?.[0]?.id || 0;
    setProdiId(firstProdi);
    const firstPeriode = periodes()?.data?.[0]?.id || '';
    setSemesterMulai(firstPeriode);
    setJumlahSksLulus(144);
    setJumlahSksWajib(120);
    setJumlahSksPilihan(24);
    setIsAktif(false);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: IKurikulum) => {
    setEditId(item.id);
    setKode(item.kode);
    setNama(item.nama);
    setProdiId(item.programStudiId);
    setSemesterMulai(item.semesterMulai);
    setJumlahSksLulus(item.jumlahSksLulus);
    setJumlahSksWajib(item.jumlahSksWajib);
    setJumlahSksPilihan(item.jumlahSksPilihan);
    setIsAktif(item.isAktif);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        kode: kode(),
        nama: nama(),
        programStudiId: Number(prodiId()),
        semesterMulai: semesterMulai(),
        jumlahSksLulus: Number(jumlahSksLulus()),
        jumlahSksWajib: Number(jumlahSksWajib()),
        jumlahSksPilihan: Number(jumlahSksPilihan()),
        isAktif: isAktif(),
      };

      if (editId()) {
        await kurikulumController.update(editId()!, payload);
      } else {
        await kurikulumController.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Kurikulum ini?')) return;
    try {
      await kurikulumController.delete(id);
      refetch();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus data');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-brand-gray-800 dark:text-white">Kelola Kurikulum</h1>
            <p class="text-sm text-brand-gray-500 dark:text-brand-gray-400">Penyusunan kurikulum per program studi sesuai dengan standar PDDIKTI</p>
          </div>
          <Button onClick={openAddModal}>+ Tambah Kurikulum</Button>
        </div>

        {/* Filter and Search */}
        <div class="flex flex-wrap gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-brand-gray-100 dark:border-slate-800">
          <div class="flex-1 min-w-[250px]">
            <Input
              type="text"
              placeholder="Cari kode atau nama kurikulum..."
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>
          <div class="w-[200px]">
            <select
              class="w-full h-10 px-3 rounded-lg border border-brand-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-700"
              onChange={(e) => setProdiFilter(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
            >
              <option value="">Semua Program Studi</option>
              <For each={prodis()?.data}>
                {(prodi) => <option value={prodi.id}>{prodi.nama}</option>}
              </For>
            </select>
          </div>
        </div>

        {/* Kurikulum Table */}
        <Table headers={['Kode', 'Nama Kurikulum', 'Program Studi', 'Mulai Berlaku', 'SKS (L/W/P)', 'Status', 'Aksi']}>
          <Show when={kurikulums.loading}>
            <tr>
              <td colspan="7" class="p-8 text-center text-brand-gray-500">Memuat data...</td>
            </tr>
          </Show>
          <Show when={!kurikulums.loading && kurikulums()?.data.length === 0}>
            <tr>
              <td colspan="7" class="p-8 text-center text-brand-gray-500">Belum ada data kurikulum.</td>
            </tr>
          </Show>
          <For each={kurikulums()?.data}>
            {(item) => (
              <tr class="hover:bg-brand-50 dark:hover:bg-slate-800/50">
                <td class="px-6 py-4 text-sm font-medium text-brand-gray-900 dark:text-white">{item.kode}</td>
                <td class="px-6 py-4 text-sm text-brand-gray-700 dark:text-brand-gray-300">{item.nama}</td>
                <td class="px-6 py-4 text-sm text-brand-gray-700 dark:text-brand-gray-300">{item.programStudi?.nama || '-'}</td>
                <td class="px-6 py-4 text-sm text-brand-gray-700 dark:text-brand-gray-300">{item.semesterMulai}</td>
                <td class="px-6 py-4 text-sm text-brand-gray-700 dark:text-brand-gray-300">
                  {item.jumlahSksLulus} / {item.jumlahSksWajib} / {item.jumlahSksPilihan}
                </td>
                <td class="px-6 py-4 text-sm">
                  <span class={`px-2 py-1 rounded-full text-xs font-semibold ${item.isAktif ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-brand-100 text-brand-gray-800 dark:bg-slate-800 dark:text-brand-gray-400'}`}>
                    {item.isAktif ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm space-x-2">
                  <Button variant="secondary" onClick={() => openEditModal(item)}>Edit</Button>
                  <Button variant="danger" onClick={() => handleDelete(item.id)}>Hapus</Button>
                </td>
              </tr>
            )}
          </For>
        </Table>

        {/* Modal Form */}
        <Modal show={showModal()} onClose={() => setShowModal(false)} title={editId() ? 'Edit Kurikulum' : 'Tambah Kurikulum'}>
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errorMsg()}</div>
            </Show>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-brand-gray-700 dark:text-brand-gray-300">Kode Kurikulum</label>
              <Input type="text" value={kode()} onInput={(e) => setKode(e.currentTarget.value)} required />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-brand-gray-700 dark:text-brand-gray-300">Nama Kurikulum</label>
              <Input type="text" value={nama()} onInput={(e) => setNama(e.currentTarget.value)} required />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-brand-gray-700 dark:text-brand-gray-300">Program Studi</label>
              <select
                class="w-full h-10 px-3 rounded-lg border border-brand-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-700"
                value={prodiId()}
                onChange={(e) => setProdiId(Number(e.currentTarget.value))}
              >
                <For each={prodis()?.data}>
                  {(prodi) => <option value={prodi.id}>{prodi.nama}</option>}
                </For>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-brand-gray-700 dark:text-brand-gray-300">Semester Mulai Berlaku</label>
              <select
                class="w-full h-10 px-3 rounded-lg border border-brand-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-700"
                value={semesterMulai()}
                onChange={(e) => setSemesterMulai(e.currentTarget.value)}
              >
                <For each={periodes()?.data}>
                  {(periode) => <option value={periode.id}>{periode.nama}</option>}
                </For>
              </select>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold text-brand-gray-700 dark:text-brand-gray-300">SKS Lulus</label>
                <Input type="number" value={jumlahSksLulus()} onInput={(e) => setJumlahSksLulus(Number(e.currentTarget.value))} required />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold text-brand-gray-700 dark:text-brand-gray-300">SKS Wajib</label>
                <Input type="number" value={jumlahSksWajib()} onInput={(e) => setJumlahSksWajib(Number(e.currentTarget.value))} required />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold text-brand-gray-700 dark:text-brand-gray-300">SKS Pilihan</label>
                <Input type="number" value={jumlahSksPilihan()} onInput={(e) => setJumlahSksPilihan(Number(e.currentTarget.value))} required />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="isAktif" checked={isAktif()} onChange={(e) => setIsAktif(e.currentTarget.checked)} />
              <label for="isAktif" class="text-sm font-semibold text-brand-gray-700 dark:text-brand-gray-300">Aktifkan Kurikulum ini</label>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
