import { For, Show } from 'solid-js';

interface Stage {
  key: string;
  label: string;
  date?: string;
  icon: string;
}

interface Props {
  status: string;
  session: {
    tanggalMulai?: string;
    tanggalTutup?: string;
    tanggalVerif?: string;
    tanggalUjian?: string;
    tanggalPengumuman?: string;
  };
}

const stageOrder = [
  'draft',
  'awaiting_payment',
  'submitted',
  'documents_verified',
  'documents_rejected',
  'exam_scheduled',
  'exam_completed',
  'passed',
  'failed',
  're_registration',
  'nim_issued',
];

const stageMap: Record<string, { label: string; icon: string }> = {
  draft: { label: 'Pendaftaran', icon: '📝' },
  awaiting_payment: { label: 'Pembayaran', icon: '💳' },
  submitted: { label: 'Pendaftaran', icon: '📝' },
  documents_verified: { label: 'Verifikasi Dokumen', icon: '📄' },
  documents_rejected: { label: 'Verifikasi Dokumen', icon: '📄' },
  returned: { label: 'Pendaftaran (Revisi)', icon: '🔄' },
  exam_scheduled: { label: 'Jadwal Ujian', icon: '✍️' },
  exam_completed: { label: 'Ujian Selesai', icon: '✍️' },
  passed: { label: 'Pengumuman', icon: '🎓' },
  failed: { label: 'Pengumuman', icon: '🎓' },
  re_registration: { label: 'Daftar Ulang', icon: '📋' },
  nim_issued: { label: 'Selesai', icon: '✅' },
};

const mainStages: Stage[] = [
  { key: 'submitted', label: 'Pendaftaran', icon: '📝' },
  { key: 'documents_verified', label: 'Verifikasi Dokumen', icon: '📄' },
  { key: 'exam_scheduled', label: 'Ujian / Seleksi', icon: '✍️' },
  { key: 'passed', label: 'Pengumuman', icon: '🎓' },
  { key: 'nim_issued', label: 'Selesai (NIM)', icon: '✅' },
];

export default function TimelineStatus(props: Props) {
  const currentIdx = () => {
    const s = props.status;
    if (s === 'returned') return 0;
    if (s === 'awaiting_payment') return 0;
    if (s === 'documents_rejected') return 1;
    if (s === 'failed') return 3;
    if (s === 're_registration') return 4;
    return mainStages.findIndex((st) => {
      const si = stageOrder.indexOf(st.key);
      const ci = stageOrder.indexOf(s);
      return ci <= si;
    });
  };

  const isCompleted = (stageKey: string) => {
    const si = stageOrder.indexOf(stageKey);
    const ci = stageOrder.indexOf(props.status);
    if (si === 0 && (ci === 1 || ci === 5 || ci === 6 || ci === 8 || ci === 9 || ci === 4)) return true; // submitted or beyond
    if (si === 0 && ci === 3) return false; // rejected → not completed
    if (si === 0 && ci === 7) return false; // returned → not completed
    return ci > si;
  };

  const isCurrent = (stageKey: string) => {
    const s = props.status;
    if (s === 'documents_rejected' && stageKey === 'documents_verified') return true;
    if (s === 'returned' && stageKey === 'submitted') return true;
    if (s === 'failed' && stageKey === 'passed') return true;
    return stageOrder.indexOf(stageKey) === stageOrder.indexOf(s);
  };

  return (
    <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6">
      <h2 class="font-semibold text-sm mb-4">Tahapan Seleksi</h2>
      <div class="relative">
        {/* Garis vertikal */}
        <div class="absolute left-4 top-2 bottom-2 w-0.5 bg-secondary-200 dark:bg-secondary-600" />

        <div class="space-y-5 relative">
          <For each={mainStages}>
            {(stage, i) => {
              const done = isCompleted(stage.key);
              const current = isCurrent(stage.key);
              const isRejected = props.status === 'documents_rejected' && stage.key === 'documents_verified';
              const isFailed = props.status === 'failed' && stage.key === 'passed';

              return (
                <div class="flex items-start gap-4 relative">
                  {/* Bullet */}
                  <div
                    class={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border-2 ${
                      done
                        ? 'bg-green-100 border-green-500 text-green-600'
                        : current
                          ? isRejected
                            ? 'bg-red-100 border-red-500 text-red-600'
                            : isFailed
                              ? 'bg-red-100 border-red-500 text-red-600'
                              : 'bg-brand-100 border-brand-500 text-brand-600'
                          : 'bg-secondary-100 border-secondary-300 text-secondary-400 dark:bg-secondary-800 dark:border-secondary-600'
                    }`}
                  >
                    {done ? '✓' : current ? (isRejected || isFailed ? '✗' : '●') : '○'}
                  </div>

                  {/* Content */}
                  <div class="flex-1 pt-1.5">
                    <div class="flex items-center gap-2">
                      <span
                        class={`text-sm font-medium ${
                          done
                            ? 'text-green-700 dark:text-green-400'
                            : current
                              ? isRejected
                                ? 'text-red-700 dark:text-red-400'
                                : isFailed
                                  ? 'text-red-700 dark:text-red-400'
                                  : 'text-brand-700 dark:text-brand-400'
                              : 'text-secondary-400 dark:text-secondary-500'
                        }`}
                      >
                        {stage.icon} {stage.label}
                      </span>

                      <Show when={done}>
                        <span class="text-xs text-green-600 dark:text-green-400">✓</span>
                      </Show>
                      <Show when={isRejected || isFailed}>
                        <span class="text-xs text-red-600 dark:text-red-400 font-semibold">Ditolak</span>
                      </Show>
                    </div>

                    {/* Tanggal */}
                    <Show when={stage.key === 'submitted' && props.session.tanggalTutup}>
                      <div class="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">
                        Tutup pendaftaran:{' '}
                        {new Date(props.session.tanggalTutup!).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </Show>
                    <Show when={stage.key === 'documents_verified' && props.session.tanggalVerif}>
                      <div class="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">
                        Batas verifikasi:{' '}
                        {new Date(props.session.tanggalVerif!).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </Show>
                    <Show when={stage.key === 'exam_scheduled' && props.session.tanggalUjian}>
                      <div class="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">
                        Jadwal ujian:{' '}
                        {new Date(props.session.tanggalUjian!).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </Show>
                    <Show when={stage.key === 'passed' && props.session.tanggalPengumuman}>
                      <div class="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">
                        Pengumuman:{' '}
                        {new Date(props.session.tanggalPengumuman!).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* Status description */}
      <div class="mt-4 pt-3 border-t border-secondary-100 dark:border-secondary-700">
        <Show when={props.status === 'draft'}>
          <p class="text-xs text-secondary-500">Lakukan pembayaran untuk melanjutkan ke tahap upload dokumen.</p>
        </Show>
        <Show when={props.status === 'awaiting_payment'}>
          <p class="text-xs text-amber-600">
            Pembayaran sedang diproses. Setelah diverifikasi, Anda bisa upload dokumen.
          </p>
        </Show>
        <Show when={props.status === 'submitted'}>
          <p class="text-xs text-secondary-500">
            Dokumen sedang diperiksa oleh admin. Pantau terus dashboard untuk hasil verifikasi.
          </p>
        </Show>
        <Show when={props.status === 'documents_rejected'}>
          <p class="text-xs text-red-600">Ada dokumen yang ditolak. Upload ulang sesuai catatan admin.</p>
        </Show>
        <Show when={props.status === 'returned'}>
          <p class="text-xs text-amber-600">
            Admin membuka akses untuk melengkapi berkas. Silakan upload ulang dan submit.
          </p>
        </Show>
        <Show when={props.status === 'documents_verified'}>
          <p class="text-xs text-teal-600">Dokumen telah diverifikasi. Tunggu jadwal ujian.</p>
        </Show>
        <Show when={props.status === 'exam_scheduled'}>
          <p class="text-xs text-secondary-500">Jadwal ujian telah diterbitkan. Datang sesuai jadwal.</p>
        </Show>
        <Show when={props.status === 'exam_completed'}>
          <p class="text-xs text-secondary-500">Ujian telah selesai. Tunggu pengumuman kelulusan.</p>
        </Show>
        <Show when={props.status === 'passed'}>
          <p class="text-xs text-green-600">Selamat! Anda lulus. Silakan lanjut ke Daftar Ulang.</p>
        </Show>
        <Show when={props.status === 'failed'}>
          <p class="text-xs text-red-600">Mohon maaf, Anda belum lulus. Silakan coba di gelombang lain.</p>
        </Show>
        <Show when={props.status === 're_registration'}>
          <p class="text-xs text-secondary-500">
            Bukti bayar sedang diverifikasi. Setelah disetujui, NIM akan diterbitkan.
          </p>
        </Show>
        <Show when={props.status === 'nim_issued'}>
          <p class="text-xs text-green-600">Selamat! Anda resmi menjadi mahasiswa Politeknik Sorowako.</p>
        </Show>
      </div>
    </div>
  );
}
