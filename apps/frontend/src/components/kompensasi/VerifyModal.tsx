import { createEffect, createMemo, createResource, createSignal, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import type { KetidakhadiranRow } from '../../controllers/kompensasiAdminController';
import { presensiController, type RekapHarianResponse } from '../../controllers/presensiController';
import { fmtTanggal } from '../../utils/format';
import { bolehNotice, hitungBatasDurasi, pesanBatasDurasi } from '../../utils/verifikasiKuota';
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
  { value: 'CUTI', label: 'Cuti' },
  { value: 'UNKNOWN', label: 'Unknown — butuh konfirmasi' },
];

const isRecognizedStatus = (s?: string | null) =>
  s === 'SAKIT' ||
  s === 'IZIN' ||
  s === 'ALPA' ||
  s === 'TERLAMBAT' ||
  s === 'HADIR' ||
  s === 'CUTI' ||
  s === 'UNKNOWN';

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
  // Menandai durasi diklamping otomatis ke batas harian saat pengguna mengetik
  // nilai di atas sisa kuota, agar tampil notice inline + toast info (di-throttle).
  const [noticeDibatasi, setNoticeDibatasi] = createSignal(false);
  const lastNoticeAt = { t: 0 };

  createEffect(() => {
    const r = props.row;
    if (!r) return;
    const s = r.status;
    setStatus(isRecognizedStatus(s) ? s! : 'ALPA');
    setDurasi(s === 'HADIR' ? 0 : (r.durasiMenit ?? 0));
    setNote(r.keterangan || '');
    setNoticeDibatasi(false);
    lastNoticeAt.t = 0;
  });

  const isUnknown = () => status() === 'UNKNOWN';
  const isHadir = () => status() === 'HADIR';
  const isCuti = () => status() === 'CUTI';

  const [rekapHarian, { refetch: refetchRekap }] = createResource(
    () => {
      const r = props.row;
      return r ? { mahasiswaId: r.mahasiswaId, tanggal: r.tanggal } : null;
    },
    (params) => presensiController.getRekapHarian(params.mahasiswaId, params.tanggal),
  );

  const rekapReady = () => rekapHarian.state === 'ready';
  const rekapFailed = () => rekapHarian.state === 'errored';

  const batasDurasi = createMemo(() => {
    const r = props.row;
    const rekap = rekapHarian();
    if (!r || !rekap) return 0;
    return hitungBatasDurasi({
      maksHarian: rekap.maksHarian,
      rows: rekap.rows,
      rowId: r.id,
      isVerified: r.isVerified,
      durasiTersimpan: r.durasiMenit ?? 0,
    });
  });

  // Hanya status ketidakhadiran (SAKIT/IZIN/ALPA/TERLAMBAT) yang dikenai cap harian.
  const isStatusDikenaiCap = () =>
    status() === 'SAKIT' || status() === 'IZIN' || status() === 'ALPA' || status() === 'TERLAMBAT';
  // Guard/clamp hanya aktif setelah rekap siap — selama masih loading (atau gagal)
  // batasDurasi() = 0 sehingga tanpa syarat isDurasiExceeds, baris terverifikasi
  // yang valid langsung terkunci.
  const isDurasiExceeds = () => rekapReady() && isStatusDikenaiCap() && durasi() > batasDurasi();

  const handleSubmit = async () => {
    const row = props.row;
    if (!row || submitting()) return;
    if (isDurasiExceeds()) {
      toast.showToast(`Durasi ${durasi()} menit melebihi batas durasi baris ini (${batasDurasi()} menit)`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      await presensiController.verifikasiUnknown({
        sumber: row.sumber,
        sumberId: Number(row.sumberId),
        statusKonfirmasi: status() as 'SAKIT' | 'IZIN' | 'ALPA' | 'TERLAMBAT' | 'HADIR' | 'UNKNOWN' | 'CUTI',
        durasiMenit: isHadir() || isCuti() ? 0 : isUnknown() ? undefined : durasi(),
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

            <Show
              when={rekapReady() && rekapHarian()}
              fallback={
                <Show when={rekapFailed()} fallback={<p class="text-xs text-secondary-400">Memuat rekap harian...</p>}>
                  <div class="flex items-center justify-between gap-2 rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20 px-3 py-2">
                    <p class="text-xs text-danger-700 dark:text-danger-300">Gagal memuat rekap harian.</p>
                    <Button onClick={() => refetchRekap()} variant="secondary" size="sm">
                      Muat ulang
                    </Button>
                  </div>
                </Show>
              }
            >
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
                    <div class="text-lg font-bold text-action dark:text-action dark:text-action-ondark">
                      {rekap().sisaKuota} mnt
                    </div>
                  </div>
                </div>
              )}
            </Show>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FilterField label="Status Konfirmasi">
                <SearchableSelect
                  options={STATUS_OPTIONS}
                  value={status()}
                  onChange={(v) => {
                    const val = String(v);
                    setStatus(val);
                    if (val === 'HADIR') setDurasi(0);
                  }}
                />
              </FilterField>
              <FilterField label="Durasi (Menit)">
                <Input
                  type="number"
                  min="0"
                  max={rekapReady() && isStatusDikenaiCap() ? batasDurasi() : undefined}
                  value={durasi()}
                  error={isDurasiExceeds() ? `Melebihi batas durasi baris ini (${batasDurasi()} menit)` : undefined}
                  disabled={isUnknown() || isHadir() || isCuti()}
                  onInput={(e) => {
                    let v = parseInt(e.currentTarget.value) || 0;
                    if (v < 0) v = 0;
                    const batas = batasDurasi();
                    if (rekapReady() && isStatusDikenaiCap() && v > batas) {
                      v = batas;
                      setNoticeDibatasi(true);
                      const now = Date.now();
                      if (bolehNotice(lastNoticeAt.t, now)) {
                        lastNoticeAt.t = now;
                        toast.showToast(pesanBatasDurasi(batas), 'info');
                      }
                    } else {
                      setNoticeDibatasi(false);
                    }
                    setDurasi(v);
                  }}
                />
                <Show when={isStatusDikenaiCap() && rekapReady() && rekapHarian()}>
                  <p class="text-fine text-secondary-400 dark:text-secondary-300">
                    Maks durasi baris ini:{' '}
                    <b class="text-secondary-600 dark:text-secondary-200">{batasDurasi()} menit</b> (batas harian{' '}
                    {rekapHarian()?.maksHarian} menit)
                  </p>
                </Show>
                <Show when={noticeDibatasi()}>
                  <p class="text-xs rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 text-warning-700 dark:text-warning-300 px-3 py-2">
                    Durasi melebihi batas harian tersisa, disesuaikan otomatis ke <b>{batasDurasi()} menit</b>.
                  </p>
                </Show>
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
                class="w-full bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl px-4 py-2.5 text-table text-secondary-800 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-action-focus"
                placeholder="Catatan verifikasi (opsional)"
                value={note()}
                onInput={(e) => setNote(e.currentTarget.value)}
              />
            </div>
            <p class="text-xs text-secondary-400 dark:text-secondary-300">
              Pilih <b>Hadir</b> atau <b>Cuti</b> untuk menganulir (durasi 0), <b>Unknown</b> untuk mengembalikan ke
              antrean konfirmasi, atau pilih status lain untuk mengkonfirmasi ketidakhadiran. <b>Cuti</b> hanya berlaku
              untuk mahasiswa berstatus cuti.
            </p>
            <div class="flex justify-end gap-2">
              <Button onClick={props.onClose} variant="secondary">
                Batal
              </Button>
              <Button onClick={handleSubmit} loading={submitting()} disabled={isDurasiExceeds()} variant="primary">
                Simpan Verifikasi
              </Button>
            </div>
          </div>
        )}
      </Show>
    </Modal>
  );
}
