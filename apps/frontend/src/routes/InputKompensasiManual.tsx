import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SearchableSelect, type SelectOption } from '../components/ui/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import {
  JENIS_KOMPEN_LABEL,
  type JenisKompen,
  kompensasiManualController,
} from '../controllers/kompensasiManualController';
import { mahasiswaController } from '../controllers/mahasiswaController';

const JENIS_OPTIONS: SelectOption[] = Object.entries(JENIS_KOMPEN_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const JENIS_FULL_DAY: JenisKompen[] = ['sakit', 'izin', 'alpa'];

export default function InputKompensasiManual() {
  const toast = useToast();

  const [selectedMhsId, setSelectedMhsId] = createSignal<number | string | null>(null);
  const [tanggal, setTanggal] = createSignal(new Date().toISOString().split('T')[0]);
  const [jenisKompen, setJenisKompen] = createSignal<string | number>('');
  const [durasiMenit, setDurasiMenit] = createSignal(0);
  const [keterangan, setKeterangan] = createSignal('');
  const [searchMhs, setSearchMhs] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const [mhsData] = createResource(
    () => searchMhs(),
    async (search) => {
      const res = await mahasiswaController.getAll(search || undefined, 1, 50);
      return res.data || [];
    },
  );

  const mhsOptions = createMemo<SelectOption[]>(() => {
    const list = mhsData() || [];
    return list.map((m) => ({ value: m.id, label: `${m.nim} — ${m.nama}` }));
  });

  const isDurasiHidden = () => JENIS_FULL_DAY.includes(jenisKompen() as JenisKompen);
  const isDurasiRequired = () => !isDurasiHidden() && jenisKompen() !== '';

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const mhsId = selectedMhsId();
    if (!mhsId) {
      toast.showToast('Silakan pilih mahasiswa terlebih dahulu', 'error');
      return;
    }
    if (!jenisKompen()) {
      toast.showToast('Silakan pilih jenis kompensasi', 'error');
      return;
    }
    if (isDurasiRequired() && (!durasiMenit() || durasiMenit() <= 0)) {
      toast.showToast('Durasi menit wajib diisi untuk jenis terlambat/rusak', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: {
        mahasiswaId: number;
        tanggal: string;
        jenisKompen: JenisKompen;
        durasiMenit?: number;
        keterangan?: string;
      } = {
        mahasiswaId: Number(mhsId),
        tanggal: tanggal(),
        jenisKompen: jenisKompen() as JenisKompen,
        keterangan: keterangan() || undefined,
      };
      if (!isDurasiHidden()) {
        payload.durasiMenit = durasiMenit();
      }

      const result = await kompensasiManualController.create(payload);
      if (result.isDuplicateRisk) {
        toast.showToast(
          'Data tersimpan. Peringatan: mahasiswa memiliki kompensasi lain di tanggal yang sama.',
          'error',
        );
      } else {
        toast.showToast('Kompensasi berhasil diinput', 'success');
      }
      setKeterangan('');
      setDurasiMenit(0);
      setJenisKompen('');
      setSelectedMhsId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as Error).message : 'Gagal menyimpan kompensasi';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div class="max-w-2xl mx-auto">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-secondary-900 dark:text-white">Input Kompensasi Manual</h1>
          <p class="text-sm text-secondary-500 mt-1">
            Sakit, Izin, dan Alpa otomatis dihitung 480 menit (tidak hadir sehari penuh). Terlambat dan Rusak wajib
            mengisi jumlah menit.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          class="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-700 shadow-sm p-6 flex flex-col gap-5"
        >
          <SearchableSelect
            label="Mahasiswa"
            required
            options={mhsOptions()}
            value={selectedMhsId()}
            onChange={setSelectedMhsId}
            placeholder="Cari NIM atau Nama Mahasiswa..."
          />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Tanggal"
              required
              value={tanggal()}
              onChange={(e: Event) => setTanggal((e.currentTarget as HTMLInputElement).value)}
            />
            <Input
              type="select"
              isSelect
              label="Jenis Kompensasi"
              required
              selectOptions={[{ value: '', label: '-- Pilih Jenis --' }, ...JENIS_OPTIONS]}
              value={jenisKompen()}
              onChange={(e: Event) => setJenisKompen((e.currentTarget as HTMLSelectElement).value)}
            />
          </div>

          <Show
            when={!isDurasiHidden()}
            fallback={
              <div class="rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-4 py-3 text-sm text-brand-700 dark:text-brand-300">
                Durasi otomatis 480 menit (satu hari penuh) untuk jenis Sakit/Izin/Alpa.
              </div>
            }
          >
            <Input
              type="number"
              min={1}
              max={480}
              label="Durasi (menit)"
              required={isDurasiRequired()}
              placeholder="Contoh: 60"
              value={durasiMenit() || ''}
              onChange={(e: Event) => setDurasiMenit(parseInt((e.currentTarget as HTMLInputElement).value) || 0)}
            />
          </Show>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
              Keterangan
            </label>
            <textarea
              rows={3}
              value={keterangan()}
              onInput={(e) => setKeterangan(e.currentTarget.value)}
              placeholder="Catatan opsional (misal: surat dokter, izin keluarga, dll.)"
              class="w-full px-4 py-2.5 rounded-xl border border-secondary-200 bg-white text-sm text-secondary-800 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100 dark:placeholder:text-secondary-500"
            />
          </div>

          <div class="flex justify-end">
            <Button type="submit" disabled={isSubmitting()}>
              {isSubmitting() ? 'Menyimpan...' : 'Simpan Kompensasi'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
