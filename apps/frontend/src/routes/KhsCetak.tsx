import { useParams } from '@solidjs/router';
import QRCode from 'qrcode';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { documentSignatureController, type SignKhsResult } from '../controllers/documentSignatureController';
import { type KhsResponse, khsController } from '../controllers/khsController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';

interface PrintData {
  nim: string;
  nama: string;
  prodi: string;
  periodeId: string;
  khs: KhsResponse;
}

/**
 * Endpoint `getByRef` hanya mengembalikan metadata tanda tangan (tanpa QR);
 * regenerasi QR dilakukan di klien dari `verifyUrl` agar cetakan berikutnya
 * tetap menampilkan QR verifikasi.
 */
async function ensureQrDataUrl(sig: SignKhsResult): Promise<SignKhsResult> {
  if (sig.qrDataUrl || !sig.verifyUrl) return sig;
  try {
    return { ...sig, qrDataUrl: await QRCode.toDataURL(sig.verifyUrl, { margin: 1, width: 240 }) };
  } catch {
    return sig;
  }
}

export default function KhsCetak() {
  const auth = useAuth();
  const params = useParams();
  const [hasPrinted, setHasPrinted] = createSignal(false);

  const [printData] = createResource(
    () => {
      const mhsId = Number(params.mhsId);
      if (!mhsId) return null;
      return { mhsId, periodeId: params.periodeId || '' };
    },
    async (target): Promise<PrintData | null> => {
      if (!target) return null;
      try {
        const khs = await khsController.getByMhsIdAndPeriode(target.mhsId, target.periodeId);
        const profile = await mahasiswaController.getById(target.mhsId).catch(() => null);
        return {
          nim: profile?.nim || '',
          nama: profile?.nama || '',
          prodi: profile?.programStudi?.nama || '',
          periodeId: target.periodeId,
          khs,
        };
      } catch {
        return null;
      }
    },
  );

  // Tanda tangan = persetujuan Kaprodi/Admin: halaman cetak HANYA MEMBACA baris
  // tanda tangan yang sudah ada — TIDAK PERNAH menerbitkan sendiri saat dibuka.
  // Penerbitan hanya melalui tombol "Setujui & Tandatangani" + konfirmasi modal
  // di halaman ini (atau lewat tab TTD Massal di /khs). Backend tetap menegakkan
  // role + scope prodi.
  const canSign = () => auth.hasRole(['kaprodi', 'admin', 'super_admin']);

  const [signature, { mutate: mutateSignature }] = createResource(
    () => {
      const mhsId = Number(params.mhsId);
      const periodeId = params.periodeId || '';
      if (!mhsId || !periodeId) return null;
      return { mhsId, periodeId };
    },
    async (target): Promise<SignKhsResult | null> => {
      if (!target) return null;
      // Hanya membaca tanda tangan yang sudah ada; tanpa menerbitkan baru.
      const existing = await documentSignatureController.getByRef(target.mhsId, target.periodeId).catch(() => null);
      return existing ? ensureQrDataUrl(existing) : null;
    },
  );

  const [showSignConfirm, setShowSignConfirm] = createSignal(false);
  const [signBusy, setSignBusy] = createSignal(false);
  const [signActionError, setSignActionError] = createSignal<string | null>(null);

  const handleApprove = async () => {
    const mhsId = Number(params.mhsId);
    const periodeId = params.periodeId || '';
    if (!mhsId || !periodeId) return;
    setShowSignConfirm(false);
    setSignActionError(null);
    setSignBusy(true);
    try {
      const signed = await documentSignatureController.signKhs(mhsId, periodeId);
      mutateSignature(await ensureQrDataUrl(signed));
    } catch (e: unknown) {
      setSignActionError(e instanceof Error ? e.message : 'Gagal menandatangani KHS.');
    } finally {
      setSignBusy(false);
    }
  };

  createEffect(() => {
    // Cetak setelah status tanda tangan selesai dimuat (bacaan `.loading` tidak
    // memicu Suspense) — cegah cetakan tanpa QR padahal dokumen sudah signed.
    if (printData() && !signature.loading && !hasPrinted()) {
      setHasPrinted(true);
      setTimeout(() => window.print(), 300);
    }
  });

  const showWatermark = () =>
    printData()?.khs.warningTunggakan || (printData()?.khs.blocked && !auth.hasRole(['mahasiswa']));

  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));
  const periodeName = () => {
    const pid = printData()?.periodeId;
    if (!pid) return '-';
    return periodes()?.data?.find((p) => p.id === pid)?.nama || pid;
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
      <Show when={signature.error}>
        <div
          role="alert"
          class="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden"
        >
          <p class="font-semibold">Tanda tangan digital gagal dimuat</p>
          <p class="mt-1 text-red-600">
            <Show
              when={auth.hasRole(['admin', 'super_admin'])}
              fallback="Coba muat ulang halaman; bila masalah berlanjut, hubungi administrator. Dokumen cetak TANPA QR verifikasi."
            >
              {signature.error instanceof Error ? signature.error.message : 'Terjadi kesalahan tidak dikenal.'} —
              Dokumen cetak TANPA QR verifikasi.
            </Show>
          </p>
        </div>
      </Show>
      <Show when={printData() && !signature.loading && !signature.error && !signature()}>
        <div
          role="status"
          class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 print:hidden"
        >
          <p class="font-semibold">Dokumen belum ditandatangani Kaprodi/Admin</p>
          <p class="mt-1 text-amber-700">
            Tanda tangan digital (QR verifikasi) hanya diterbitkan setelah persetujuan Kaprodi/Admin di halaman ini
            (tombol di bawah) atau melalui tab TTD Massal. Dokumen dapat dicetak tanpa QR verifikasi.
          </p>
          <Show when={canSign()}>
            <div class="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSignActionError(null);
                  setShowSignConfirm(true);
                }}
                disabled={signBusy()}
                class="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95 disabled:opacity-50"
              >
                Setujui & Tandatangani
              </button>
            </div>
          </Show>
        </div>
      </Show>
      <div class="mb-4 flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          class="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95"
        >
          🖨️ Cetak Sekarang
        </button>
      </div>

      <Show
        when={!printData.loading}
        fallback={
          <div class="flex items-center justify-center py-24 text-secondary-400">
            <div class="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            <span class="text-sm">Menyiapkan data cetak...</span>
          </div>
        }
      >
        <Show
          when={printData()}
          fallback={
            <div class="rounded-2xl border border-secondary-100 p-10 text-center text-secondary-500">
              Data KHS tidak dapat dimuat. Pastikan Anda memiliki akses ke data mahasiswa ini.
            </div>
          }
        >
          {(data) => (
            <div id="print-area-khs" class="relative text-secondary-800">
              <Show when={showWatermark()}>
                <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center print:fixed">
                  <span class="rotate-[-30deg] border-4 border-red-500/40 px-10 py-2 text-3xl font-black uppercase tracking-widest text-red-500/40">
                    TUNGGAKAN — CETAK ADMIN
                  </span>
                </div>
              </Show>

              <div class="border-b border-secondary-200 pb-3 text-center">
                <h2 class="text-xl font-bold tracking-wider text-brand-700">POLITEKNIK SOROWAKO</h2>
                <h3 class="text-base font-bold uppercase tracking-widest text-secondary-600">
                  Kartu Hasil Studi (KHS) — Semester
                </h3>
                <p class="text-xs text-secondary-500">Periode Akademik: {periodeName()}</p>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-4 text-xs text-secondary-700">
                <div>
                  <p>
                    Nama: <span class="font-bold text-secondary-900">{data().nama || '-'}</span>
                  </p>
                  <p>
                    NIM: <span class="font-bold">{data().nim || '-'}</span>
                  </p>
                </div>
                <div class="text-right">
                  <p>
                    Program Studi: <span class="font-bold">{data().prodi || '-'}</span>
                  </p>
                  <p>
                    Semester: <span class="font-bold">{data().khs.semester ?? '-'}</span>
                  </p>
                  <p>
                    IP Semester: <span class="font-bold">{data().khs.summary?.ipSemester ?? '-'}</span>
                  </p>
                  <p>
                    IPK: <span class="font-bold">{data().khs.summary?.ipk ?? '-'}</span>
                  </p>
                  <p>
                    Nilai Sikap: <span class="font-bold">{data().khs.nilaiSikap?.narasi || '-'}</span>
                  </p>
                </div>
              </div>

              <Show when={data().khs.warningTunggakan}>
                {(wt) => (
                  <div class="mt-3 border border-red-300 bg-red-50 p-3 text-xs text-red-700">
                    <p class="font-bold">Peringatan: {wt().reason}</p>
                    <p>{wt().detail}</p>
                  </div>
                )}
              </Show>

              <table class="mt-4 w-full border-collapse text-left text-xs">
                <thead>
                  <tr class="border-b border-secondary-200 bg-secondary-50 font-bold uppercase text-secondary-500">
                    <th class="border-r border-secondary-200 p-2">Kode MK</th>
                    <th class="border-r border-secondary-200 p-2">Mata Kuliah</th>
                    <th class="border-r border-secondary-200 p-2">Kelas</th>
                    <th class="border-r border-secondary-200 p-2 text-center">SKS</th>
                    <th class="border-r border-secondary-200 p-2 text-center">Nilai Angka</th>
                    <th class="border-r border-secondary-200 p-2 text-center">Nilai Huruf</th>
                    <th class="p-2 text-center">Indeks</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={data().khs.krsList || []}>
                    {(r) => (
                      <tr class="border-b border-secondary-200">
                        <td class="border-r border-secondary-200 p-2">{r.mataKuliah.kode}</td>
                        <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">
                          {r.mataKuliah.nama}
                        </td>
                        <td class="border-r border-secondary-200 p-2">{r.kelasKuliah.namaKelas}</td>
                        <td class="border-r border-secondary-200 p-2 text-center">{r.mataKuliah.sksTotal}</td>
                        <td class="border-r border-secondary-200 p-2 text-center">{r.nilaiAngka ?? '-'}</td>
                        <td class="border-r border-secondary-200 p-2 text-center font-bold">{r.nilaiHuruf ?? '-'}</td>
                        <td class="p-2 text-center">{r.nilaiIndeks ?? '-'}</td>
                      </tr>
                    )}
                  </For>
                  <Show when={!data().khs.krsList?.length}>
                    <tr>
                      <td colspan="7" class="p-6 text-center text-secondary-400">
                        Tidak ada mata kuliah pada periode ini.
                      </td>
                    </tr>
                  </Show>
                </tbody>
                <tfoot>
                  <tr class="font-bold text-secondary-800">
                    <td colspan="3" class="border-r border-secondary-200 p-2 text-right">
                      Total SKS
                    </td>
                    <td class="border-r border-secondary-200 p-2 text-center">{data().khs.summary?.totalSks ?? 0}</td>
                    <td colspan="3" class="p-2 text-center">
                      IP Semester: {data().khs.summary?.ipSemester ?? '-'}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div class="mt-12 grid grid-cols-2 gap-4 text-xs text-secondary-700">
                <div class="text-center">
                  <p>Mengetahui,</p>
                  <p>{signature()?.signerJabatan ? signature()?.signerJabatan : 'Kaprodi / Pimpinan'}</p>
                  <Show when={signature()?.qrDataUrl} fallback={<div class="h-16" />}>
                    <img
                      src={signature()?.qrDataUrl}
                      width="128"
                      height="128"
                      alt="QR verifikasi dokumen"
                      class="mx-auto mt-2 mb-1"
                    />
                  </Show>
                  <p class="font-bold underline">
                    {signature()?.signerNama ?? '.........................................................'}
                  </p>
                  <Show when={signature()?.signerJabatan}>
                    <p class="mt-1 text-secondary-500">{signature()?.signerJabatan}</p>
                  </Show>
                </div>
                <div class="text-center">
                  <p>Mahasiswa</p>
                  <div class="h-16" />
                  <p class="font-bold underline">{data().nama || '...........................'}</p>
                </div>
              </div>

              <Show when={signature()}>
                {(sig) => (
                  <div class="mt-6 flex flex-col items-center border-t border-secondary-200 pt-4 text-center text-xs text-secondary-500">
                    <p class="font-semibold text-secondary-700">Dokumen ditandatangani digital (QR Signed-Hash)</p>
                    <p>
                      Ditandatangani: {sig().signerNama}
                      {sig().signerJabatan ? ` • ${sig().signerJabatan}` : ''}
                    </p>
                    <p>Verifikasi: {sig().verifyUrl}</p>
                    <p class="font-mono">Hash: {sig().docHash}</p>
                  </div>
                )}
              </Show>
            </div>
          )}
        </Show>
      </Show>

      {/* Modal konfirmasi — satu-satunya jalur penerbitan tanda tangan di halaman cetak */}
      <Modal
        isOpen={showSignConfirm()}
        onClose={() => setShowSignConfirm(false)}
        title="Konfirmasi Persetujuan Tanda Tangan"
        maxWidth="md"
      >
        <div class="flex flex-col gap-4">
          <p class="text-base text-secondary-600 dark:text-secondary-300">
            Akan menyetujui dan menandatangani KHS <b>{printData()?.nama || '-'}</b>
            {printData()?.nim ? ` (NIM ${printData()?.nim})` : ''} pada periode <b>{periodeName()}</b>.
          </p>
          <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-caption text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
            ⚠ Tanda tangan = persetujuan otoritatif Kaprodi/Admin. Bila nilai KHS berubah setelah ditandatangani, tanda
            tangan lama dicabut (QR cetakan lama menjadi REVOKED) dan diganti tanda tangan baru.
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowSignConfirm(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleApprove} disabled={signBusy()}>
              {signBusy() ? 'Menandatangani...' : 'Setujui & Tandatangani'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
