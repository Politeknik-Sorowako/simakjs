import { useParams } from '@solidjs/router';
import QRCode from 'qrcode';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import KopSurat, { KOPI_FALLBACK } from '../components/cetak/KopSurat';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { type SkpiDokumen, type SkpiSignatureMeta, skpiController } from '../controllers/skpiController';
import { fmtTanggal, getTodayString } from '../utils/format';

/**
 * Endpoint GET dokumen hanya mengembalikan metadata tanda tangan (tanpa QR);
 * regenerasi QR dilakukan di klien dari `verifyUrl` agar cetakan berikutnya
 * tetap menampilkan QR verifikasi (pola KhsCetak.tsx).
 */
async function ensureQrDataUrl(sig: SkpiSignatureMeta): Promise<SkpiSignatureMeta & { qrDataUrl?: string }> {
  if (!sig.verifyUrl) return sig;
  try {
    return { ...sig, qrDataUrl: await QRCode.toDataURL(sig.verifyUrl, { margin: 1, width: 240 }) };
  } catch {
    return sig;
  }
}

export default function SkpiCetak() {
  const auth = useAuth();
  const params = useParams();
  const [hasPrinted, setHasPrinted] = createSignal(false);

  const [doc, { refetch: refetchDoc }] = createResource(
    () => {
      const mhsId = Number(params.mhsId);
      return mhsId ? mhsId : null;
    },
    async (mhsId): Promise<SkpiDokumen | null> => {
      // Kegagalan (403/404/5xx) ditelan → `doc()` bernilai null sehingga fallback
      //"Dokumen tidak dapat dimuat" tampil, bukan lempar ke ErrorBoundary rute.
      try {
        return await skpiController.getDokumen(mhsId);
      } catch {
        return null;
      }
    },
  );

  // Profil tambahan (angkatan) untuk kop identitas — kegagalan tidak fatal.
  // `angkatan` dikirim backend tapi belum ada di interface `Mahasiswa`.
  const [profile] = createResource(
    () => {
      const mhsId = Number(params.mhsId);
      return mhsId ? mhsId : null;
    },
    async (mhsId) => {
      const p = await mahasiswaController.getById(mhsId).catch(() => null);
      return p as unknown as { angkatan?: string } | null;
    },
  );

  // Regenerasi QR klien dari signature pada dokumen.
  const [sigQr] = createResource(
    () => doc()?.signature?.verifyUuid ?? null,
    async () => {
      const sig = doc()?.signature;
      return sig ? ensureQrDataUrl(sig) : null;
    },
  );

  /**
   * Halaman cetak HANYA MEMBACA baris tanda tangan — TIDAK PERNAH menerbitkan
   * sendiri saat dibuka. Penerbitan hanya lewat modal konfirmasi di halaman ini.
   * Keputusan produk: khusus staff-verifier (backend menegakkan scope).
   */
  const canSign = () => auth.hasRole(['super_admin', 'admin', 'prodi', 'kaprodi', 'kemahasiswaan']);

  const [showSignConfirm, setShowSignConfirm] = createSignal(false);
  const [signBusy, setSignBusy] = createSignal(false);
  const [signActionError, setSignActionError] = createSignal<string | null>(null);

  const handleSign = async () => {
    const mhsId = Number(params.mhsId);
    if (!mhsId) return;
    setSignActionError(null);
    setSignBusy(true);
    try {
      await skpiController.signDokumen(mhsId);
      await refetchDoc();
    } catch (e: unknown) {
      setSignActionError(e instanceof Error ? e.message : 'Gagal menandatangani SKPI.');
    } finally {
      setShowSignConfirm(false);
      setSignBusy(false);
    }
  };

  createEffect(() => {
    // Cetak setelah dokumen + status tanda tangan selesai dimuat.
    if (doc() && !doc.loading && !sigQr.loading && !hasPrinted()) {
      setHasPrinted(true);
      setTimeout(() => window.print(), 300);
    }
  });

  // Nomor surat dari backend (`skpi_nomor_format`); judul & nomor selalu di
  // BAWAH garis kop (keputusan produk tahap kop global).
  const nomorSurat = () => {
    const d = doc();
    if (!d) return '-';
    if (d.nomorSurat) return d.nomorSurat;
    // Fallback lama bila backend tidak mengirim nomorSurat.
    const tahun = new Date().getFullYear();
    return `SKPI/${tahun}/${d.mahasiswa.nim}`;
  };

  return (
    <div class="min-h-screen bg-white p-8 text-secondary-800">
      <Show when={signActionError()}>
        <div
          role="alert"
          class="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden"
        >
          <p class="font-semibold">Penandatanganan gagal</p>
          <p class="mt-1 text-red-600">{signActionError()} — Dokumen tetap TANPA QR verifikasi.</p>
        </div>
      </Show>

      <div class="mb-4 flex justify-end gap-2 print:hidden">
        <Show when={!doc()?.signature && canSign()}>
          <button
            type="button"
            onClick={() => {
              setSignActionError(null);
              setShowSignConfirm(true);
            }}
            disabled={signBusy()}
            class="rounded-full bg-action px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-action-dark active:scale-95 disabled:opacity-50"
          >
            Tandatangani & Terbitkan QR
          </button>
        </Show>
        <Show when={!doc()?.signature && !canSign()}>
          <p class="self-center text-xs text-secondary-500">
            Penandatanganan & penerbitan QR dilakukan oleh staf (Admin/Prodi/Kaprodi/Kemahasiswaan).
          </p>
        </Show>
        <button
          type="button"
          onClick={() => window.print()}
          class="rounded-full bg-action px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-action-dark active:scale-95"
        >
          🖨️ Cetak Sekarang
        </button>
      </div>

      <Show
        when={!doc.loading}
        fallback={
          <div class="flex items-center justify-center py-24 text-secondary-400">
            <div class="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-action border-t-transparent" />
            <span class="text-sm">Menyiapkan data cetak...</span>
          </div>
        }
      >
        <Show
          when={doc()}
          fallback={
            <div class="rounded-2xl border border-secondary-100 p-10 text-center text-secondary-500">
              Dokumen SKPI tidak dapat dimuat. Pastikan Anda memiliki akses ke data mahasiswa ini.
            </div>
          }
        >
          {(d) => (
            <div id="print-area-skpi" class="relative text-secondary-800">
              {/* Kop surat global (logo + info) lalu judul & nomor di bawah garisnya */}
              <KopSurat kop={d().kop ?? KOPI_FALLBACK} />
              <div class="mt-3 text-center">
                <h3 class="text-sm font-bold uppercase tracking-widest text-secondary-700">
                  Surat Keterangan Pendamping Ijazah (SKPI)
                </h3>
                <p class="text-xs text-secondary-500">Nomor: {nomorSurat()}</p>
              </div>

              {/* Identitas mahasiswa */}
              <div class="mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-secondary-700">
                <div>
                  <p>
                    Nama Lengkap: <span class="font-bold text-secondary-900">{d().mahasiswa.nama || '-'}</span>
                  </p>
                  <p>
                    NIM: <span class="font-bold">{d().mahasiswa.nim || '-'}</span>
                  </p>
                </div>
                <div>
                  <p>
                    Program Studi: <span class="font-bold">{d().mahasiswa.prodi ?? '-'}</span>
                  </p>
                  <p>
                    Jenjang: <span class="font-bold">{d().mahasiswa.jenjang ?? '-'}</span>
                  </p>
                </div>
                <div>
                  <p>
                    Tahun Masuk: <span class="font-bold">{profile()?.angkatan ?? '-'}</span>
                  </p>
                </div>
                <div>
                  <p>
                    Status: <span class="font-bold capitalize">{(d().mahasiswa.status ?? '-').replace('_', ' ')}</span>
                  </p>
                </div>
              </div>

              {/* Daftar kegiatan terverifikasi */}
              <p class="mt-6 text-xs font-bold uppercase tracking-wider text-secondary-600">
                Daftar Pencapaian Kegiatan Mahasiswa
              </p>
              <table class="mt-2 w-full border-collapse text-left text-xs">
                <thead>
                  <tr class="border-b border-secondary-200 bg-secondary-50 font-bold uppercase text-secondary-500">
                    <th class="border-r border-secondary-200 p-2 w-8 text-center">No</th>
                    <th class="border-r border-secondary-200 p-2">Nama Kegiatan</th>
                    <th class="border-r border-secondary-200 p-2">Jenis</th>
                    <th class="border-r border-secondary-200 p-2">Penyelenggara</th>
                    <th class="border-r border-secondary-200 p-2">Tanggal</th>
                    <th class="border-r border-secondary-200 p-2">Lokasi</th>
                    <th class="border-r border-secondary-200 p-2">No. Sertifikat</th>
                    <th class="p-2 text-center">Poin</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={d().kegiatan}>
                    {(k, idx) => (
                      <tr class="border-b border-secondary-200 align-top">
                        <td class="border-r border-secondary-200 p-2 text-center">{idx() + 1}</td>
                        <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">{k.namaKegiatan}</td>
                        <td class="border-r border-secondary-200 p-2">{k.kategori?.nama ?? '-'}</td>
                        <td class="border-r border-secondary-200 p-2">{k.penyelenggara ?? '-'}</td>
                        <td class="border-r border-secondary-200 p-2 whitespace-nowrap">
                          {fmtTanggal(k.tanggalMulai)}
                          <Show when={k.tanggalSelesai}>
                            {(s) => (
                              <>
                                <br />– {fmtTanggal(s())}
                              </>
                            )}
                          </Show>
                        </td>
                        <td class="border-r border-secondary-200 p-2">{k.lokasi ?? '-'}</td>
                        <td class="border-r border-secondary-200 p-2">{k.nomorSertifikat ?? '-'}</td>
                        <td class="p-2 text-center font-bold">{k.poin}</td>
                      </tr>
                    )}
                  </For>
                  <Show when={d().kegiatan.length === 0}>
                    <tr>
                      <td colspan="8" class="p-6 text-center text-secondary-400">
                        Belum ada kegiatan terverifikasi.
                      </td>
                    </tr>
                  </Show>
                </tbody>
                <tfoot>
                  <tr class="font-bold text-secondary-800">
                    <td colspan="7" class="border-t border-secondary-300 p-2 text-right">
                      Total Poin Pencapaian
                    </td>
                    <td class="border-t border-secondary-300 p-2 text-center">{d().totalPoin}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Pernyataan */}
              <p class="mt-6 text-xs leading-relaxed text-secondary-700">
                Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya. Keaslian
                dokumen ini dapat diverifikasi melalui QR Code di bawah ini.
              </p>

              {/* Blok tanda tangan */}
              <div class="mt-10 flex justify-end text-xs text-secondary-700">
                <div class="w-64 text-center">
                  <p>Mengetahui,</p>
                  <p>{sigQr()?.signerJabatan || doc()?.signature?.signerJabatan || 'Kaprodi / Pimpinan'}</p>
                  <Show when={sigQr()?.qrDataUrl} fallback={<div class="h-32" />}>
                    <img
                      src={sigQr()?.qrDataUrl}
                      width="128"
                      height="128"
                      alt="QR verifikasi dokumen SKPI"
                      class="mx-auto mt-2 mb-1"
                    />
                  </Show>
                  <p class="font-bold underline">
                    {sigQr()?.signerNama ||
                      doc()?.signature?.signerNama ||
                      '.........................................................'}
                  </p>
                  <Show when={sigQr()?.signerJabatan || doc()?.signature?.signerJabatan}>
                    {(j) => <p class="mt-1 text-secondary-500">{j()}</p>}
                  </Show>
                </div>
              </div>

              {/* Footer teknis */}
              <div class="mt-8 border-t border-secondary-200 pt-3 text-center text-[10px] text-secondary-500">
                <Show
                  when={sigQr() || doc()?.signature}
                  fallback={<p>Dokumen ini belum ditandatangani secara elektronik.</p>}
                >
                  {(sig) => (
                    <>
                      <p class="font-semibold text-secondary-700">
                        Dokumen ditandatangani digital (QR Signed-Hash) • Tanggal terbit: {getTodayString()}
                      </p>
                      <p>
                        Verifikasi: {(sig() as SkpiSignatureMeta & { qrDataUrl?: string }).verifyUrl} •{' '}
                        <span class="font-mono">
                          UUID: {(sig() as SkpiSignatureMeta & { qrDataUrl?: string }).verifyUuid}
                        </span>
                      </p>
                      <p class="font-mono">Hash: {(sig() as SkpiSignatureMeta & { qrDataUrl?: string }).docHash}</p>
                    </>
                  )}
                </Show>
              </div>
            </div>
          )}
        </Show>
      </Show>

      {/* Modal konfirmasi — satu-satunya jalur penerbitan tanda tangan di halaman cetak */}
      <Modal
        isOpen={showSignConfirm()}
        onClose={() => setShowSignConfirm(false)}
        title="Konfirmasi Penerbitan Tanda Tangan SKPI"
        maxWidth="md"
      >
        <div class="flex flex-col gap-4">
          <p class="text-base text-secondary-600 dark:text-secondary-300">
            Akan menandatangani SKPI <b>{doc()?.mahasiswa.nama || '-'}</b>
            {doc()?.mahasiswa.nim ? ` (NIM ${doc()?.mahasiswa.nim})` : ''} berisi{' '}
            <b>{doc()?.totalKegiatan ?? 0} kegiatan terverifikasi</b> dengan total poin <b>{doc()?.totalPoin ?? 0}</b>.
          </p>
          <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-caption text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
            ⚠ Bila daftar kegiatan terverifikasi berubah setelah ditandatangani, tanda tangan lama dicabut (QR cetakan
            lama menjadi REVOKED) dan diganti tanda tangan baru.
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowSignConfirm(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSign} disabled={signBusy()}>
              {signBusy() ? 'Menandatangani...' : 'Terbitkan Tanda Tangan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
