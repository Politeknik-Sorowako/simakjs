import { createSignal, createResource, Show, For } from 'solid-js';
import { mahasiswaController, Mahasiswa as IMahasiswa } from '../controllers/mahasiswaController';
import { prodiController } from '../controllers/prodiController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';

export default function Mahasiswa() {
  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);

  // Fetch Mahasiswa Data
  const [mahasiswas, { refetch }] = createResource(
    () => ({ search: search(), page: page(), limit: limit() }),
    ({ search, page, limit }) => mahasiswaController.getAll(search, page, limit)
  );

  // Fetch Program Studi for Dropdowns
  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [nim, setNim] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [prodiId, setProdiId] = createSignal<number>(0);
  const [status, setStatus] = createSignal('aktif');
  const [namaIbu, setNamaIbu] = createSignal('');
  const [nik, setNik] = createSignal('');
  const [gender, setGender] = createSignal<'L' | 'P'>('L');
  const [birthdate, setBirthdate] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');

  const openAddModal = () => {
    setEditId(null);
    setNim('');
    setNama('');
    setEmail('');
    const firstProdi = prodis()?.data?.[0]?.id || 0;
    setProdiId(firstProdi);
    setStatus('aktif');
    setNamaIbu('');
    setNik('');
    setGender('L');
    setBirthdate('');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: IMahasiswa) => {
    setEditId(item.id);
    setNim(item.nim);
    setNama(item.nama);
    setEmail(item.email);
    setProdiId(item.programStudiId || 0);
    setStatus(item.status);
    setNamaIbu(item.namaIbuKandung || '');
    setNik(item.nik || '');
    setGender(item.jenisKelamin);
    setBirthdate(item.tanggalLahir ? String(item.tanggalLahir).split('T')[0] : '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        nim: nim(),
        nama: nama(),
        email: email(),
        programStudiId: Number(prodiId()),
        status: status(),
        namaIbuKandung: namaIbu(),
        nik: nik(),
        jenisKelamin: gender(),
        tanggalLahir: birthdate(),
      };

      if (editId()) {
        await mahasiswaController.update(editId()!, payload);
      } else {
        await mahasiswaController.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Mahasiswa ini?')) return;
    try {
      await mahasiswaController.delete(id);
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
            <h1 class="text-2xl font-extrabold text-gray-800">Mahasiswa</h1>
            <p class="text-sm text-gray-500">Kelola informasi data mahasiswa aktif dan administrasi akademik.</p>
          </div>
          <Button onClick={openAddModal}>+ Tambah Mahasiswa</Button>
        </div>

        <div class="max-w-xs">
          <Input
            placeholder="Cari NIM atau nama..."
            value={search()}
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
        </div>

        <Show when={!mahasiswas.loading} fallback={<div class="text-center py-10 text-gray-400">Loading data...</div>}>
          <Table headers={['NIM', 'Nama', 'Email', 'Program Studi', 'Status', 'Aksi']}>
            <For each={mahasiswas()?.data}>
              {(item) => (
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4 font-mono text-gray-600 font-semibold">{item.nim}</td>
                  <td class="px-6 py-4 font-medium text-gray-800">{item.nama}</td>
                  <td class="px-6 py-4 text-gray-500">{item.email}</td>
                  <td class="px-6 py-4 text-gray-600">{item.programStudi?.nama || '-'}</td>
                  <td class="px-6 py-4">
                    <span class={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      item.status === 'aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 flex gap-2">
                    <Button variant="secondary" onClick={() => openEditModal(item)} class="!py-1 !px-2.5">
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(item.id)} class="!py-1 !px-2.5">
                      Hapus
                    </Button>
                  </td>
                </tr>
              )}
            </For>
            <Show when={mahasiswas()?.data.length === 0}>
              <tr>
                <td colspan="6" class="px-6 py-10 text-center text-gray-400">
                  Tidak ada data mahasiswa ditemukan.
                </td>
              </tr>
            </Show>
          </Table>

          {/* Pagination */}
          <Show when={mahasiswas() && mahasiswas()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-xs text-gray-500">
                Menampilkan halaman {page()} dari {mahasiswas()?.meta.totalPages} ({mahasiswas()?.meta.total} total data)
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
                  disabled={page() >= mahasiswas()!.meta.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, mahasiswas()!.meta.totalPages))}
                  class="!py-1 !px-3"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </Show>
        </Show>

        <Modal show={showModal()} title={editId() ? 'Edit Data Mahasiswa' : 'Tambah Mahasiswa'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg()}
              </div>
            </Show>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="NIM"
                required
                value={nim()}
                onInput={(e) => setNim(e.currentTarget.value)}
                placeholder="Contoh: 2004012"
              />
              <Input
                label="Nama Lengkap"
                required
                value={nama()}
                onInput={(e) => setNama(e.currentTarget.value)}
                placeholder="Contoh: Budi Santoso"
              />
              <Input
                type="email"
                label="Email"
                required
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                placeholder="budi@domain.com"
              />
              <Input
                isSelect
                label="Program Studi"
                value={prodiId()}
                onChange={(e) => setProdiId(Number(e.currentTarget.value))}
                selectOptions={
                  prodis()?.data.map((p) => ({ label: `${p.jenjang} - ${p.nama}`, value: p.id })) || []
                }
              />
              <Input
                label="NIK (16 Digit)"
                required
                value={nik()}
                onInput={(e) => setNik(e.currentTarget.value)}
                placeholder="16 digit nomor induk kependudukan"
              />
              <Input
                label="Nama Ibu Kandung"
                required
                value={namaIbu()}
                onInput={(e) => setNamaIbu(e.currentTarget.value)}
                placeholder="Nama lengkap ibu kandung"
              />
              <Input
                isSelect
                label="Jenis Kelamin"
                value={gender()}
                onChange={(e) => setGender(e.currentTarget.value as 'L' | 'P')}
                selectOptions={[
                  { label: 'Laki-laki', value: 'L' },
                  { label: 'Perempuan', value: 'P' },
                ]}
              />
              <Input
                type="date"
                label="Tanggal Lahir"
                required
                value={birthdate()}
                onInput={(e) => setBirthdate(e.currentTarget.value)}
              />
              <Input
                isSelect
                label="Status"
                value={status()}
                onChange={(e) => setStatus(e.currentTarget.value)}
                selectOptions={[
                  { label: 'Aktif', value: 'aktif' },
                  { label: 'Cuti', value: 'cuti' },
                  { label: 'Lulus', value: 'lulus' },
                  { label: 'Drop Out', value: 'drop_out' },
                ]}
              />
            </div>
            <div class="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit">
                Simpan
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
