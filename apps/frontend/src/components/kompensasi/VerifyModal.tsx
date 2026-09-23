import { createEffect, createResource, createSignal, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import type { KetidakhadiranRow } from '../../controllers/kompensasiAdminController';
import { presensiController, type RekapHarianResponse } from '../../controllers/presensiController';
import { fmtTanggal } from '../../utils/format';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { SearchableSelect, type SelectOption } from '../ui/SearchableSelect';
import { StudentAvatar } from '../ui/StudentAvatar';
import { FilterField, SumberBadge } from './shared';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'HADIR', label: 'Hadir' },
  { value: 'SAKIT', label: 'Sakit' },
  { value: 'IZIN', label: 'Izin' },
  { value: 'ALPA', label: 'Alpa' },
  { value: 'TERLAMBAT', label: 'Terlambat' },
  { value: 'UNKNOWN', label: 'Unknown — butuh konfirmasi' },
];

interface VerifyModalProps {
  row: KetidakhadiranRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function VerifyModal(props: VerifyModalProps) {
  const toast = useToast();
  const [status, setStatus] = createSignal('ALPA');
  const [durasi, setDurasi] = createSignal(0);
  const [note, setNote] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);

  createEffect(() => {
    const r = props.row;
    if (!r) return;
    const s = r.status;
    setStatus(s === 'SAKIT' || s === 'IZIN' || s === 'ALPA' || s === 'TERLAMBAT' ? s : 'ALPA');
    setDurasi(r.durasiMenit ?? 0);
    setNote(r.keterangan || '');
  });

  const isUnknown = () => status() === 'UNKNOWN';

  const [rekapHarian] = createResource(
    () => {
      const r = props.row;
      return r ? { mahasiswaId: r.mahasiswaId, tanggal: r.tanggal } : null;
    },
    (params) => presensiController.getRekapHarian(params.mahasiswaId, params.tanggal),
  );

  const handleSubmit = async () => {
    const row = props.row;
    if (!row || submitting()) return;
    setSubmitting(true);
    try {
      await presensiController.verifikasiUnknown({
        sumber: row.sumber,
        sumberId: Number(row.sumberId),
        statusKonfirmasi: status() as 'SAKIT' | 'IZIN' | 'ALPA' | 'TERLAMBAT' | 'HADIR' | 'UNKNOWN',
        durasiMenit: isUnknown() ? undefined : durasi(),
        keterangan: note() || undefined,
      });
      toast.showToast('Ketidakhadiran berhasil diverifikasi', 'success');
      props.onSaved();
      props.onClose();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal memverifikasi ketidakhadiran', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={props.row !== null} onClose={props.onClose} title="Verifikasi Ketidakhadiran" maxWidth="lg">
      <Show when={props.row}>
        {(row) => (
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-3 bg-secondary-50 dark:bg-secondary-800 rounded-xl p-4 border border-secondary-100 dark:border-secondary-800">
              <StudentAvatar foto={row().foto} nama={row().nama} nim={row().nim} size="md" />
              <div class="flex-1">
                <div class="font-bold text-secondary-800 dark:text-white">{row().nama}</div>
                <div class="text-xs text-secondary-400 dark:text-secondary-200">
                  {row().nim} · {row().prodiNama || '-'}
                </div>
                <div class="text-xs text-secondary-500 dark:text-secondary-300 mt-1">
                  {fmtTanggal(row().tanggal)} · <SumberBadge sumber={row().sumber} />
                </div>
              </div>
            </div>

            <Show when={rekapHarian()} fallback={<p class="text-xs text-secondary-400">Memuat rekap harian...</p>}>
              {(rekap: () => RekapHarianResponse) => (
                <div class="grid grid-cols-3 gap-3">
                  <div class="rounded-xl border border-secondary-200 dark:border-secondary-800 p-3 text-center">
                    <div class="text-fine uppercase text-secondary-400 font-semibold">Maks Harian</div>
                    <div class="text-lg font-bold text-secondary-800 dark:text-white">{rekap().maksHarian} mnt</div>
                  </div>
                  <div class="rounded-xl border border-secondary-200 dark:border-secondary-800 p-3 text-center">
                    <div class="text-fine uppercase text-secondary-400 font-semibold">Terverifikasi</div>
                    <div class="text-lg font-bold text-secondary-800 dark:text-white">
                      {rekap().totalTerverifikasi} mnt
                    </div>
                  </div>
                  <div class="rounded-xl border border-secondary-200 dark:border-secondary-800 p-3 text-center">
                    <div class="text-fine uppercase text-secondary-400 font-semibold">Sisa Kuota</div>
                    <div class="text-lg font-bold text-accent-600 dark:text-accent-400">{rekap().sisaKuota} mnt</div>
                  </div>
                </div>
              )}
            </Show>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FilterField label="Status Konfirmasi">
                <SearchableSelect options={STATUS_OPTIONS} value={status()} onChange={(v) => setStatus(String(v))} />
              </FilterField>
              <FilterField label="Durasi (Menit)">
                <Input
                  type="number"
                  min="0"
                  value={durasi()}
                  disabled={isUnknown()}
                  onInput={(e) => setDurasi(parseInt(e.currentTarget.value) || 0)}
                />
              </FilterField>
            </div>
            <Show when={isUnknown()}>
              <p class="text-xs rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 text-warning-700 dark:text-warning-300 px-3 py-2">
                Baris akan dikembalikan ke <b>antrean verifikasi</b> dan keluar dari perhitungan kompensasi sampai
                dikonfirmasi ulang. Durasi dikembalikan dari catatan sumber asli.
              </p>
            </Show>
            <div class="flex flex-col gap-1">
              <label class="text-fine font-semibold uppercase tracking-wider text-secondary-400 dark:text-secondary-300">
                Keterangan / Catatan
              </label>
              <textarea
                rows="3"
                class="w-full bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl px-4 py-2.5 text-table text-secondary-800 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Catatan verifikasi (opsional)"
                value={note()}
                onInput={(e) => setNote(e.currentTarget.value)}
              />
            </div>
            <p class="text-xs text-secondary-400 dark:text-secondary-300">
              Pilih <b>Hadir</b> untuk menganulir (durasi 0), <b>Unknown</b> untuk mengembalikan ke antrean konfirmasi,
              atau pilih status lain untuk mengkonfirmasi ketidakhadiran.
            </p>
            <div class="flex justify-end gap-2">
              <Button onClick={props.onClose} variant="secondary">
                Batal
              </Button>
              <Button onClick={handleSubmit} loading={submitting()} variant="primary">
                Simpan Verifikasi
              </Button>
            </div>
          </div>
        )}
      </Show>
    </Modal>
  );
}
