import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { dosenController, Dosen as IDosen } from '../controllers/dosenController';
import { prodiController } from '../controllers/prodiController';
import { userController } from '../controllers/userController';

export default function Dosen() {
  const toast = useToast();
  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);
  const [showImportModal, setShowImportModal] = createSignal(false);
  const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
  const [bulkLoading, setBulkLoading] = createSignal(false);

  const auth = useAuth();
  const workspace = useWorkspace();
  const isGlobalFilterActive = () => auth.user()?.role === 'admin';

  // Fetch Dosen Data
  const [dosens, { refetch }] = createResource(
    () => ({
      search: search(),
      page: page(),
      limit: limit(),
      prodiId: isGlobalFilterActive() ? workspace.selectedProdiId() : null,
    }),
    ({ search, page, limit, prodiId }) => dosenController.getAll(search, page, limit, prodiId || undefined),
  );

  // Fetch Program Studi for Dropdown
  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [nip, setNip] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [prodiId, setProdiId] = createSignal<number>(0);
  const [nidn, setNidn] = createSignal('');
  const [nik, setNik] = createSignal('');
  const [gender, setGender] = createSignal<'L' | 'P' | ''>('');
  const [birthdate, setBirthdate] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');

  const openAddModal = () => {
    setEditId(null);
    setNip('');
    setNama('');
    setEmail('');
    const firstProdi = prodis()?.data?.[0]?.id || 0;
    setProdiId(firstProdi);
    setNidn('');
    setNik('');
    setGender('L');
    setBirthdate('');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: IDosen) => {
    setEditId(item.id);
    setNip(item.nip);
    setNama(item.nama);
    setEmail(item.email);
    setProdiId(item.programStudiId || 0);
    setNidn(item.nidn || '');
    setNik(item.nik || '');
    setGender(item.jenisKelamin || 'L');
    setBirthdate(item.tanggalLahir ? String(item.tanggalLahir).split('T')[0] : '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        nip: nip(),
        nama: nama(),
        email: email(),
        programStudiId: Number(prodiId()),
        nidn: nidn() || null,
        nik: nik() || null,
        jenisKelamin: gender() === '' ? null : (gender() as 'L' | 'P'),
        tanggalLahir: birthdate() || null,
      };

      if (editId()) {
        await dosenController.update(editId()!, payload);
      } else {
        await dosenController.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Dosen ini?')) return;
    try {
      await dosenController.delete(id);
      refetch();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal menghapus data');
    }
  };

  const toggleSelectAll = () => {
    const list = dosens()?.data || [];
    if (selectedIds().length === list.length && list.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((item) => item.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds().includes(id)) {
      setSelectedIds(selectedIds().filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds(), id]);
    }
  };

  const isAllSelected = () => {
    const list = dosens()?.data || [];
    return list.length > 0 && selectedIds().length === list.length;
  };

  const handleBulkCreateAccount = async () => {
    const ids = selectedIds();
    if (ids.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin membuatkan akun secara massal untuk ${ids.length} dosen terpilih?`)) return;

    setBulkLoading(true);
    try {
      const res = await userController.generateAccounts('dosen', ids);
      if (res.errors && res.errors.length > 0) {
        toast.showToast(
          `Berhasil membuat ${res.successCount} akun. Beberapa gagal: ${res.errors.join(', ')}`,
          'warning',
        );
      } else {
        toast.showToast(`Berhasil membuat ${res.successCount} akun dosen.`, 'success');
      }
      setSelectedIds([]);
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal membuat akun secara massal.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Dosen</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Kelola data dosen pengajar dan program studi terkait.
            </p>
          </div>
          <div class="flex gap-2">
            <Show when={selectedIds().length > 0}>
              <Button variant="success" disabled={bulkLoading()} onClick={handleBulkCreateAccount}>
                {bulkLoading() ? 'Memproses...' : `🔑 Buat Akun (${selectedIds().length})`}
              </Button>
            </Show>
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
              📥 Impor CSV
            </Button>
            <Button onClick={openAddModal}>+ Tambah Dosen</Button>
          </div>
        </div>

        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          importUrl="/dosen/import"
          templateHeaders={[
            'nip',
            'nama',
            'email',
            'programStudiKode',
            'nidn',
            'nik',
            'jenisKelamin',
            'tanggalLahir',
            'tempatLahir',
            'idAgama',
          ]}
          title="Dosen"
          onSuccess={() => refetch()}
        />

        <div class="max-w-xs">
          <Input
            placeholder="Cari NIP atau nama..."
            value={search()}
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
        </div>

        <Show
          when={!dosens.loading}
          fallback={<div class="text-center py-10 text-secondary-400 dark:text-secondary-200">Loading data...</div>}
        >
          <Table
            headers={[
              <input
                type="checkbox"
                checked={isAllSelected()}
                onChange={toggleSelectAll}
                class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500 dark:border-secondary-700"
              />,
              'NIP',
              'Nama',
              'Email',
              'Program Studi',
              'NIDN',
              'Aksi',
            ]}
          >
            <For each={dosens()?.data}>
              {(item) => (
                <tr class="hover:bg-secondary-50/50 transition-colors dark:hover:bg-secondary-800/50">
                  <td class="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds().includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500 dark:border-secondary-700"
                    />
                  </td>
                  <td class="px-6 py-4 font-mono text-secondary-600 font-semibold dark:text-secondary-200">
                    {item.nip}
                  </td>
                  <td class="px-6 py-4 font-medium text-secondary-800 dark:text-white">{item.nama}</td>
                  <td class="px-6 py-4 text-secondary-500 dark:text-secondary-200">{item.email}</td>
                  <td class="px-6 py-4 text-secondary-600 dark:text-secondary-200">{item.programStudi?.nama || '-'}</td>
                  <td class="px-6 py-4 text-secondary-500 dark:text-secondary-200">{item.nidn || '-'}</td>
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
            <Show when={dosens()?.data.length === 0}>
              <tr>
                <td colspan="6" class="px-6 py-10 text-center text-secondary-400 dark:text-secondary-200">
                  Tidak ada data dosen ditemukan.
                </td>
              </tr>
            </Show>
          </Table>

          {/* Pagination */}
          <Show when={dosens() && dosens()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-xs text-secondary-500 dark:text-secondary-200">
                Menampilkan halaman {page()} dari {dosens()?.meta.totalPages} ({dosens()?.meta.total} total data)
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
                  disabled={page() >= dosens()!.meta.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, dosens()!.meta.totalPages))}
                  class="!py-1 !px-3"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </Show>
        </Show>

        <Modal
          show={showModal()}
          title={editId() ? 'Edit Data Dosen' : 'Tambah Dosen'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100 dark:bg-red-900/30 dark:text-red-400">
                {errorMsg()}
              </div>
            </Show>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="NIP"
                required
                value={nip()}
                onInput={(e) => setNip(e.currentTarget.value)}
                placeholder="Contoh: 19800101..."
              />
              <Input
                label="Nama Lengkap"
                required
                value={nama()}
                onInput={(e) => setNama(e.currentTarget.value)}
                placeholder="Contoh: Dr. Budi Santoso"
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
                selectOptions={prodis()?.data.map((p) => ({ label: `${p.jenjang} - ${p.nama}`, value: p.id })) || []}
              />
              <Input
                label="NIDN"
                value={nidn()}
                onInput={(e) => setNidn(e.currentTarget.value)}
                placeholder="Nomor Induk Dosen Nasional"
              />
              <Input
                label="NIK"
                value={nik()}
                onInput={(e) => setNik(e.currentTarget.value)}
                placeholder="Nomor Induk Kependudukan"
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
                value={birthdate()}
                onInput={(e) => setBirthdate(e.currentTarget.value)}
              />
            </div>
            <div class="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
