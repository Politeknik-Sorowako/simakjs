import { useNavigate, useParams } from '@solidjs/router';
import { createResource, createSignal, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { admisiController } from '../controllers/admisiController';

export default function AdmisiEditPendaftaran() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [app] = createResource(
    () => Number(params.id),
    (id) => admisiController.getApplicationDetail(id).then((r) => r.data),
  );

  const [form, setForm] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSaving(true);
    try {
      await admisiController.updateApplication(Number(params.id), form());
      toast.showToast('Biodata berhasil disimpan!', 'success');
      navigate(`/admisi/pendaftaran/${params.id}`);
    } catch (err: any) {
      toast.showToast(err.message || 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(`/admisi/pendaftaran/${params.id}`)}
          class="text-sm text-brand-600 hover:text-brand-700 mb-4"
        >
          ← Kembali
        </button>

        <h1 class="text-2xl font-bold mb-6">Edit Biodata Pendaftaran</h1>

        <Show when={app.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat...</div>
        </Show>

        <Show
          when={
            app() &&
            (app()!.status === 'draft' || app()!.status === 'documents_rejected' || app()!.status === 'returned')
          }
        >
          <form
            onSubmit={handleSubmit}
            class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 space-y-4"
          >
            <div class="grid md:grid-cols-2 gap-4">
              <Input
                label="NIK (16 digit)"
                maxLength={16}
                value={form()['nik'] || app()?.nik || ''}
                onInput={(e) => handleChange('nik', e.currentTarget.value)}
              />
              <Input
                label="Nama Lengkap"
                value={form()['namaLengkap'] || app()?.namaLengkap || ''}
                onInput={(e) => handleChange('namaLengkap', e.currentTarget.value)}
              />
              <Input
                label="Tempat Lahir"
                value={form()['tempatLahir'] || app()?.tempatLahir || ''}
                onInput={(e) => handleChange('tempatLahir', e.currentTarget.value)}
              />
              <Input
                label="Tanggal Lahir (YYYY-MM-DD)"
                value={form()['tanggalLahir'] || app()?.tanggalLahir || ''}
                onInput={(e) => handleChange('tanggalLahir', e.currentTarget.value)}
              />
              <div>
                <label class="text-sm font-medium text-secondary-700 dark:text-secondary-300 block mb-1">
                  Jenis Kelamin
                </label>
                <select
                  value={form()['jenisKelamin'] || app()?.jenisKelamin || ''}
                  onChange={(e) => handleChange('jenisKelamin', e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
                >
                  <option value="">-- Pilih --</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <Input
                label="Telepon"
                value={form()['telepon'] || app()?.telepon || ''}
                onInput={(e) => handleChange('telepon', e.currentTarget.value)}
              />
              <Input
                label="Nama Ibu Kandung"
                value={form()['namaIbuKandung'] || app()?.namaIbuKandung || ''}
                onInput={(e) => handleChange('namaIbuKandung', e.currentTarget.value)}
              />
              <Input
                label="Asal Sekolah"
                value={form()['asalSekolah'] || app()?.asalSekolah || ''}
                onInput={(e) => handleChange('asalSekolah', e.currentTarget.value)}
              />
              <Input
                label="Jurusan Sekolah"
                value={form()['jurusanSekolah'] || app()?.jurusanSekolah || ''}
                onInput={(e) => handleChange('jurusanSekolah', e.currentTarget.value)}
              />
              <Input
                label="Tahun Lulus"
                value={form()['tahunLulus'] || app()?.tahunLulus || ''}
                onInput={(e) => handleChange('tahunLulus', e.currentTarget.value)}
              />
            </div>
            <Input
              label="Alamat"
              value={form()['jalan'] || app()?.jalan || ''}
              onInput={(e) => handleChange('jalan', e.currentTarget.value)}
            />
            <div class="grid md:grid-cols-3 gap-4">
              <Input
                label="RT"
                value={form()['rt'] || app()?.rt || ''}
                onInput={(e) => handleChange('rt', e.currentTarget.value)}
              />
              <Input
                label="RW"
                value={form()['rw'] || app()?.rw || ''}
                onInput={(e) => handleChange('rw', e.currentTarget.value)}
              />
              <Input
                label="Kode Pos"
                value={form()['kodePos'] || app()?.kodePos || ''}
                onInput={(e) => handleChange('kodePos', e.currentTarget.value)}
              />
            </div>
            <div class="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate(`/admisi/pendaftaran/${params.id}`)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving()}>
                {saving() ? 'Menyimpan...' : 'Simpan Biodata'}
              </Button>
            </div>
          </form>
        </Show>

        <Show
          when={
            app() && app()!.status !== 'draft' && app()!.status !== 'documents_rejected' && app()!.status !== 'returned'
          }
        >
          <div class="text-center py-8 text-amber-600">Pendaftaran sudah disubmit, tidak bisa diedit.</div>
        </Show>
      </div>
    </MainLayout>
  );
}
