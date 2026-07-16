import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { khsController, PengajuanYudisium } from '../controllers/khsController';
import { mahasiswaController } from '../controllers/mahasiswaController';

export default function Yudisium() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();
  const role = () => user()?.role;

  // Student profile (if Mahasiswa)
  const [mhsProfile] = createResource(
    () => {
      if (role() === 'mahasiswa') return user()?.email;
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await mahasiswaController.getAll(email, 1, 1);
      return res.data[0] || null;
    },
  );

  // Load student's own yudisium submission
  const [myYudisium, { refetch: refetchMyYudisium }] = createResource(
    () => mhsProfile()?.id,
    async (mhsId) => {
      if (!mhsId) return null;
      return await khsController.getPengajuanYudisium(mhsId);
    },
  );

  // Load all yudisium submissions (for Admin/Dosen/Prodi)
  const [allYudisium, { refetch: refetchAllYudisium }] = createResource(
    () => {
      if (role() === 'admin' || role() === 'dosen' || role() === 'prodi') return true;
      return null;
    },
    async () => {
      return await khsController.getAllYudisium();
    },
  );

  // Load all students list (for Admin Input Dropdown)
  const [studentsList] = createResource(
    () => {
      if (role() === 'admin' || role() === 'dosen' || role() === 'prodi') return true;
      return null;
    },
    async () => {
      const res = await mahasiswaController.getAll('', 1, 100);
      return res.data || [];
    },
  );

  // Form states for Student Submission
  const [judulTa, setJudulTa] = createSignal('');
  const [skorToefl, setSkorToefl] = createSignal(450);
  const [bebasPerpustakaan, setBebasPerpustakaan] = createSignal(false);
  const [bebasLab, setBebasLab] = createSignal(false);
  const [buktiPembayaranWisuda, setBuktiPembayaranWisuda] = createSignal(false);

  // Form states for Admin Inputting student yudisium
  const [showInputModal, setShowInputModal] = createSignal(false);
  const [adminSelectedMhsId, setAdminSelectedMhsId] = createSignal<number | null>(null);
  const [adminJudulTa, setAdminJudulTa] = createSignal('');
  const [adminSkorToefl, setAdminSkorToefl] = createSignal(450);
  const [adminBebasPerpustakaan, setAdminBebasPerpustakaan] = createSignal(false);
  const [adminBebasLab, setAdminBebasLab] = createSignal(false);
  const [adminBuktiPembayaranWisuda, setAdminBuktiPembayaranWisuda] = createSignal(false);

  // Verification states for Admin Modal
  const [showVerifyModal, setShowVerifyModal] = createSignal(false);
  const [selectedSubmission, setSelectedSubmission] = createSignal<PengajuanYudisium | null>(null);
  const [adminStatus, setAdminStatus] = createSignal<'diajukan' | 'diverifikasi' | 'disetujui' | 'ditolak'>('diajukan');
  const [adminCatatan, setAdminCatatan] = createSignal('');

  // Skala Predikat Kelulusan states
  const [activeTab, setActiveTab] = createSignal<'pengajuan' | 'predikat'>('pengajuan');
  const [showPredikatModal, setShowPredikatModal] = createSignal(false);
  const [predikatId, setPredikatId] = createSignal<number | null>(null);
  const [ipkMin, setIpkMin] = createSignal('');
  const [ipkMax, setIpkMax] = createSignal('');
  const [predikatText, setPredikatText] = createSignal('');

  const [predikats, { refetch: refetchPredikats }] = createResource(
    () => {
      if (role() === 'admin') return true;
      return null;
    },
    async () => {
      return await khsController.getAllPredikat();
    },
  );

  // Handle student submit/update
  const handleStudentSubmit = async (e: Event) => {
    e.preventDefault();
    const mhsId = mhsProfile()?.id;
    if (!mhsId) return;

    if (!judulTa().trim()) {
      toast.showToast('Judul Tugas Akhir wajib diisi.', 'error');
      return;
    }

    try {
      await khsController.submitPengajuanYudisium(mhsId, {
        judulTa: judulTa(),
        skorToefl: Number(skorToefl()),
        bebasPerpustakaan: bebasPerpustakaan(),
        bebasLab: bebasLab(),
        buktiPembayaranWisuda: buktiPembayaranWisuda(),
      });
      toast.showToast('Pengajuan yudisium berhasil dikirim.', 'success');
      refetchMyYudisium();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal mengirim pengajuan.', 'error');
    }
  };

  // Handle Admin manual input submit
  const handleAdminSubmit = async (e: Event) => {
    e.preventDefault();
    const mhsId = adminSelectedMhsId();
    if (!mhsId) {
      toast.showToast('Silakan pilih mahasiswa terlebih dahulu.', 'error');
      return;
    }
    if (!adminJudulTa().trim()) {
      toast.showToast('Judul Tugas Akhir wajib diisi.', 'error');
      return;
    }

    try {
      await khsController.submitPengajuanYudisium(mhsId, {
        judulTa: adminJudulTa(),
        skorToefl: Number(adminSkorToefl()),
        bebasPerpustakaan: adminBebasPerpustakaan(),
        bebasLab: adminBebasLab(),
        buktiPembayaranWisuda: adminBuktiPembayaranWisuda(),
      });
      toast.showToast('Pengajuan yudisium mahasiswa berhasil disimpan.', 'success');
      setShowInputModal(false);
      refetchAllYudisium();
      // Clear form
      setAdminSelectedMhsId(null);
      setAdminJudulTa('');
      setAdminSkorToefl(450);
      setAdminBebasPerpustakaan(false);
      setAdminBebasLab(false);
      setAdminBuktiPembayaranWisuda(false);
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menyimpan pengajuan.', 'error');
    }
  };

  // Open Verify Modal for Admin
  const openVerifyModal = (item: PengajuanYudisium) => {
    setSelectedSubmission(item);
    setAdminStatus(item.status);
    setAdminCatatan(item.catatan || '');
    setShowVerifyModal(true);
  };

  // Handle admin verify / update yudisium
  const handleAdminVerify = async (e: Event) => {
    e.preventDefault();
    const item = selectedSubmission();
    if (!item) return;

    try {
      await khsController.updateYudisiumStatus(item.mahasiswaId, {
        status: adminStatus(),
        catatan: adminCatatan(),
      });
      toast.showToast('Status yudisium berhasil diperbarui.', 'success');
      setShowVerifyModal(false);
      refetchAllYudisium();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal memperbarui status.', 'error');
    }
  };

  const [isEditMode, setIsEditMode] = createSignal(false);

  createEffect(() => {
    const data = myYudisium();
    if (data) {
      setJudulTa(data.judulTa || '');
      setSkorToefl(data.skorToefl || 450);
      setBebasPerpustakaan(data.bebasPerpustakaan || false);
      setBebasLab(data.bebasLab || false);
      setBuktiPembayaranWisuda(data.buktiPembayaranWisuda || false);
    }
  });

  const handleSavePredikat = async (e: Event) => {
    e.preventDefault();
    if (!ipkMin() || !ipkMax() || !predikatText().trim()) {
      toast.showToast('Semua kolom wajib diisi.', 'error');
      return;
    }
    try {
      await khsController.savePredikat({
        id: predikatId() || undefined,
        ipkMin: ipkMin(),
        ipkMax: ipkMax(),
        predikat: predikatText(),
      });
      toast.showToast('Skala predikat kelulusan berhasil disimpan.', 'success');
      setShowPredikatModal(false);
      refetchPredikats();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menyimpan skala predikat.', 'error');
    }
  };

  const handleDeletePredikat = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus skala predikat ini?')) return;
    try {
      await khsController.deletePredikat(id);
      toast.showToast('Skala predikat kelulusan berhasil dihapus.', 'success');
      refetchPredikats();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menghapus skala predikat.', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 dark:bg-secondary-900/60 dark:border-secondary-800">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Evaluasi & Yudisium Wisuda</h1>
            <p class="text-sm text-secondary-500 font-medium">
              Pengajuan yudisium wisuda, kelengkapan berkas administrasi, dan evaluasi kelulusan
            </p>
          </div>
        </div>

        {/* --- STUDENT VIEW --- */}
        <Show when={role() === 'mahasiswa'}>
          <Show
            when={!myYudisium.loading}
            fallback={<div class="text-center py-10 text-secondary-400">Memuat data pengajuan...</div>}
          >
            <Show
              when={myYudisium() && !isEditMode()}
              fallback={
                <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm max-w-2xl dark:bg-secondary-900 dark:border-secondary-800">
                  <div class="flex justify-between items-center border-b pb-2 mb-4">
                    <h3 class="font-bold text-secondary-800 dark:text-white">Form Pengajuan Yudisium Mandiri</h3>
                    <Show when={myYudisium()}>
                      <button
                        onClick={() => setIsEditMode(false)}
                        class="px-3 py-1 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 text-xs font-bold rounded-lg transition-colors"
                      >
                        Batal Edit
                      </button>
                    </Show>
                  </div>
                  <form onSubmit={handleStudentSubmit} class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1.5">
                      <label class="text-xs font-bold text-secondary-700">Judul Tugas Akhir / Skripsi</label>
                      <textarea
                        rows="3"
                        placeholder="Tulis judul TA Anda secara lengkap..."
                        value={judulTa()}
                        onInput={(e) => setJudulTa(e.currentTarget.value)}
                        class="border border-secondary-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 resize-none text-secondary-900 dark:border-secondary-700 dark:text-white"
                      />
                    </div>

                    <div class="flex flex-col gap-1.5">
                      <label class="text-xs font-bold text-secondary-700">Skor TOEFL</label>
                      <input
                        type="number"
                        value={skorToefl()}
                        onInput={(e) => setSkorToefl(parseInt(e.currentTarget.value))}
                        class="border border-secondary-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white"
                      />
                    </div>

                    <div class="p-4 bg-secondary-50 rounded-xl border border-secondary-100 flex flex-col gap-2.5 dark:bg-secondary-800 dark:border-secondary-800">
                      <span class="text-xs uppercase font-extrabold tracking-wider text-secondary-400">
                        Deklarasi Mandiri Kelengkapan Administrasi:
                      </span>

                      <label class="flex items-center gap-3 text-xs font-bold text-secondary-700">
                        <input
                          type="checkbox"
                          checked={bebasPerpustakaan()}
                          onChange={(e) => setBebasPerpustakaan(e.currentTarget.checked)}
                          class="w-4 h-4 text-brand-600 border-secondary-300 rounded focus:ring-brand-500 dark:border-secondary-700"
                        />
                        Bebas Pinjaman Perpustakaan (Bebas Pustaka)
                      </label>

                      <label class="flex items-center gap-3 text-xs font-bold text-secondary-700">
                        <input
                          type="checkbox"
                          checked={bebasLab()}
                          onChange={(e) => setBebasLab(e.currentTarget.checked)}
                          class="w-4 h-4 text-brand-600 border-secondary-300 rounded focus:ring-brand-500 dark:border-secondary-700"
                        />
                        Bebas Inventaris Laboratorium / Bengkel
                      </label>

                      <label class="flex items-center gap-3 text-xs font-bold text-secondary-700">
                        <input
                          type="checkbox"
                          checked={buktiPembayaranWisuda()}
                          onChange={(e) => setBuktiPembayaranWisuda(e.currentTarget.checked)}
                          class="w-4 h-4 text-brand-600 border-secondary-300 rounded focus:ring-brand-500 dark:border-secondary-700"
                        />
                        Telah Melakukan Pembayaran Biaya Wisuda
                      </label>
                    </div>

                    <button
                      type="submit"
                      class="px-5 py-3 bg-brand-600 text-white font-bold rounded-xl text-sm hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-accent-200 self-start dark:bg-brand-700 dark:hover:bg-brand-600"
                    >
                      Ajukan Yudisium
                    </button>
                  </form>
                </div>
              }
            >
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
                  <div class="flex items-center justify-between border-b pb-2">
                    <h3 class="font-bold text-secondary-800 dark:text-white">Detail Pengajuan Yudisium</h3>
                    <span
                      class={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        myYudisium()?.status === 'disetujui'
                          ? 'bg-accent-50 text-accent-600 border border-accent-100'
                          : myYudisium()?.status === 'ditolak'
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : 'bg-accent-50 text-accent-600 border border-accent-100'
                      }`}
                    >
                      STATUS: {myYudisium()?.status?.toUpperCase()}
                    </span>
                  </div>

                  <div class="flex flex-col gap-3 text-sm text-secondary-700 font-medium">
                    <div>
                      <span class="text-xs text-secondary-400 block font-semibold">JUDUL TUGAS AKHIR / SKRIPSI</span>
                      <p class="font-bold text-secondary-900 mt-0.5 dark:text-white">{myYudisium()?.judulTa}</p>
                    </div>
                    <div>
                      <span class="text-xs text-secondary-400 block font-semibold">SKOR TOEFL</span>
                      <p class="font-bold text-secondary-900 mt-0.5 dark:text-white">{myYudisium()?.skorToefl}</p>
                    </div>
                    <div>
                      <span class="text-xs text-secondary-400 block font-semibold">BERKAS ADMINISTRASI</span>
                      <ul class="list-disc pl-5 mt-1 flex flex-col gap-1 text-xs">
                        <li>
                          Bebas Pustaka:{' '}
                          <span
                            class={
                              myYudisium()?.bebasPerpustakaan ? 'text-accent-600 font-bold' : 'text-rose-600 font-bold'
                            }
                          >
                            {myYudisium()?.bebasPerpustakaan ? 'TERPENUHI' : 'BELUM'}
                          </span>
                        </li>
                        <li>
                          Bebas Lab/Bengkel:{' '}
                          <span
                            class={myYudisium()?.bebasLab ? 'text-accent-600 font-bold' : 'text-rose-600 font-bold'}
                          >
                            {myYudisium()?.bebasLab ? 'TERPENUHI' : 'BELUM'}
                          </span>
                        </li>
                        <li>
                          Bukti Bayar Wisuda:{' '}
                          <span
                            class={
                              myYudisium()?.buktiPembayaranWisuda
                                ? 'text-accent-600 font-bold'
                                : 'text-rose-600 font-bold'
                            }
                          >
                            {myYudisium()?.buktiPembayaranWisuda ? 'TERPENUHI' : 'BELUM'}
                          </span>
                        </li>
                      </ul>
                    </div>
                    <Show when={myYudisium()?.catatan}>
                      <div class="p-3 bg-accent-50 border border-accent-100 text-accent-800 rounded-xl text-xs dark:border-accent-800">
                        <span class="font-bold block mb-1">Catatan Verifikator:</span>
                        {myYudisium()?.catatan}
                      </div>
                    </Show>
                  </div>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-3 dark:bg-secondary-900 dark:border-secondary-800">
                  <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">Update Berkas</h3>
                  <p class="text-xs text-secondary-400">
                    Anda dapat memperbarui judul TA atau checklist jika ada revisi berkas admin.
                  </p>
                  <button
                    onClick={() => {
                      setIsEditMode(true);
                      toast.showToast('Silakan sesuaikan data pada form.', 'info');
                    }}
                    class="mt-2 py-2 bg-secondary-50 border border-secondary-200 text-secondary-700 font-bold rounded-xl text-xs hover:bg-secondary-100 transition-colors dark:bg-secondary-800 dark:border-secondary-700"
                  >
                    Edit Data Pengajuan
                  </button>
                </div>
              </div>
            </Show>
          </Show>
        </Show>

        {/* --- ADMIN, DOSEN & PRODI VIEW --- */}
        <Show when={role() === 'admin' || role() === 'dosen' || role() === 'prodi'}>
          {/* Tab Switcher (Only for admin) */}
          <Show when={role() === 'admin'}>
            <div class="flex gap-2 border-b border-secondary-100 pb-3 mb-6 dark:border-secondary-800">
              <button
                onClick={() => setActiveTab('pengajuan')}
                class={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab() === 'pengajuan'
                    ? 'bg-brand-600 text-white shadow-sm shadow-accent-200'
                    : 'bg-white border border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                }`}
              >
                Daftar Pengajuan
              </button>
              <button
                onClick={() => setActiveTab('predikat')}
                class={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab() === 'predikat'
                    ? 'bg-brand-600 text-white shadow-sm shadow-accent-200'
                    : 'bg-white border border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                }`}
              >
                Pengaturan Skala Predikat Kelulusan
              </button>
            </div>
          </Show>

          <Show when={activeTab() === 'pengajuan' || role() === 'dosen' || role() === 'prodi'}>
            <div class="flex justify-between items-center gap-4 bg-white/60 p-6 rounded-2xl border border-secondary-100 shadow-sm mb-4 dark:bg-secondary-900/60 dark:border-secondary-800">
              <h3 class="font-bold text-secondary-800 dark:text-white">Daftar Pengajuan Yudisium Mahasiswa</h3>
              <button
                onClick={() => setShowInputModal(true)}
                class="px-4 py-2 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-accent-200 dark:bg-brand-700 dark:hover:bg-brand-600"
              >
                ➕ Input Yudisium Mahasiswa
              </button>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm overflow-x-auto dark:bg-secondary-900 dark:border-secondary-800">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                    <th class="p-3">Mahasiswa</th>
                    <th class="p-3">Program Studi</th>
                    <th class="p-3">Judul TA</th>
                    <th class="p-3">Skor TOEFL</th>
                    <th class="p-3">Checklist Berkas</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-secondary-50 text-secondary-600 dark:text-secondary-200 font-medium">
                  <For
                    each={allYudisium()}
                    fallback={
                      <tr>
                        <td colspan="7" class="p-4 text-center text-secondary-400 italic">
                          Belum ada pengajuan yudisium terdaftar.
                        </td>
                      </tr>
                    }
                  >
                    {(item) => (
                      <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                        <td class="p-3">
                          <div class="flex flex-col">
                            <span class="font-bold text-secondary-800 dark:text-white">{item.mahasiswa?.nama}</span>
                            <span class="text-[10px] text-secondary-400">NIM: {item.mahasiswa?.nim}</span>
                          </div>
                        </td>
                        <td class="p-3">{item.prodi?.nama}</td>
                        <td class="p-3 max-w-[200px] truncate" title={item.judulTa}>
                          {item.judulTa}
                        </td>
                        <td class="p-3">{item.skorToefl}</td>
                        <td class="p-3 whitespace-nowrap">
                          <span
                            class={`mr-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${item.bebasPerpustakaan ? 'bg-accent-50 text-accent-600 border' : 'bg-rose-50 text-rose-600 border'}`}
                          >
                            Pustaka
                          </span>
                          <span
                            class={`mr-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${item.bebasLab ? 'bg-accent-50 text-accent-600 border' : 'bg-rose-50 text-rose-600 border'}`}
                          >
                            Lab
                          </span>
                          <span
                            class={`px-1.5 py-0.5 rounded text-[9px] font-bold ${item.buktiPembayaranWisuda ? 'bg-accent-50 text-accent-600 border' : 'bg-rose-50 text-rose-600 border'}`}
                          >
                            Bayar
                          </span>
                        </td>
                        <td class="p-3">
                          <span
                            class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.status === 'disetujui'
                                ? 'bg-accent-50 text-accent-600 border border-accent-100'
                                : item.status === 'ditolak'
                                  ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                  : 'bg-accent-50 text-accent-600 border border-accent-100'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td class="p-3">
                          <button
                            onClick={() => openVerifyModal(item)}
                            class="px-3 py-1.5 bg-brand-600 text-white font-bold rounded-lg text-[10px] hover:bg-brand-700 active:scale-95 transition-all shadow-sm dark:bg-brand-700 dark:hover:bg-brand-600"
                          >
                            Verifikasi
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>

          <Show when={activeTab() === 'predikat' && role() === 'admin'}>
            <div class="flex justify-between items-center gap-4 bg-white/60 p-6 rounded-2xl border border-secondary-100 shadow-sm mb-4 dark:bg-secondary-900/60 dark:border-secondary-800">
              <h3 class="font-bold text-secondary-800 dark:text-white">Skala Predikat Kelulusan Yudisium</h3>
              <button
                onClick={() => {
                  setPredikatId(null);
                  setIpkMin('');
                  setIpkMax('');
                  setPredikatText('');
                  setShowPredikatModal(true);
                }}
                class="px-4 py-2 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-accent-200 dark:bg-brand-700 dark:hover:bg-brand-600"
              >
                ➕ Tambah Skala Predikat
              </button>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm overflow-x-auto dark:bg-secondary-900 dark:border-secondary-800">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                    <th class="p-3">IPK Min</th>
                    <th class="p-3">IPK Max</th>
                    <th class="p-3">Predikat Kelulusan</th>
                    <th class="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-secondary-50 text-secondary-600 dark:text-secondary-200 font-medium">
                  <For
                    each={predikats()}
                    fallback={
                      <tr>
                        <td colspan="4" class="p-4 text-center text-secondary-400 italic">
                          Belum ada aturan skala predikat kelulusan.
                        </td>
                      </tr>
                    }
                  >
                    {(pred) => (
                      <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                        <td class="p-3 font-mono">{parseFloat(pred.ipkMin).toFixed(2)}</td>
                        <td class="p-3 font-mono">{parseFloat(pred.ipkMax).toFixed(2)}</td>
                        <td class="p-3 font-bold text-secondary-800 dark:text-white">{pred.predikat}</td>
                        <td class="p-3 flex gap-2">
                          <button
                            onClick={() => {
                              setPredikatId(pred.id);
                              setIpkMin(pred.ipkMin);
                              setIpkMax(pred.ipkMax);
                              setPredikatText(pred.predikat);
                              setShowPredikatModal(true);
                            }}
                            class="px-2.5 py-1 bg-secondary-100 text-secondary-700 font-semibold rounded-lg hover:bg-secondary-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePredikat(pred.id)}
                            class="px-2.5 py-1 bg-rose-50 text-rose-600 font-semibold rounded-lg hover:bg-rose-100 transition-colors dark:bg-rose-900/30 dark:text-rose-400"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>

        {/* --- ADMIN MANUAL INPUT MODAL --- */}
        <Show when={showInputModal()}>
          <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 dark:bg-secondary-900">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-secondary-800 text-sm dark:text-white">Input Yudisium Mahasiswa (Admin)</h3>
                <button onClick={() => setShowInputModal(false)} class="text-secondary-400 hover:text-secondary-600">
                  ❌
                </button>
              </div>

              <form onSubmit={handleAdminSubmit} class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">Pilih Mahasiswa</label>
                  <select
                    class="border border-secondary-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 bg-white font-medium dark:border-secondary-700 dark:text-white dark:bg-secondary-900"
                    value={adminSelectedMhsId() || ''}
                    onChange={(e) => setAdminSelectedMhsId(parseInt(e.currentTarget.value))}
                  >
                    <option value="">-- Pilih Mahasiswa --</option>
                    <For each={studentsList()}>
                      {(student) => (
                        <option value={student.id}>
                          {student.nama} ({student.nim})
                        </option>
                      )}
                    </For>
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">Judul Tugas Akhir / Skripsi</label>
                  <textarea
                    rows="3"
                    placeholder="Tulis judul Tugas Akhir..."
                    value={adminJudulTa()}
                    onInput={(e) => setAdminJudulTa(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 resize-none text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">Skor TOEFL</label>
                  <input
                    type="number"
                    value={adminSkorToefl()}
                    onInput={(e) => setAdminSkorToefl(parseInt(e.currentTarget.value))}
                    class="border border-secondary-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>

                <div class="p-3 bg-secondary-50 rounded-xl border border-secondary-100 flex flex-col gap-2.5 dark:bg-secondary-800 dark:border-secondary-800">
                  <span class="text-xs uppercase font-extrabold tracking-wider text-secondary-400">
                    Verifikasi Kelengkapan Berkas:
                  </span>

                  <label class="flex items-center gap-3 text-xs font-bold text-secondary-700">
                    <input
                      type="checkbox"
                      checked={adminBebasPerpustakaan()}
                      onChange={(e) => setAdminBebasPerpustakaan(e.currentTarget.checked)}
                      class="w-4 h-4 text-brand-600 border-secondary-300 rounded focus:ring-brand-500 dark:border-secondary-700"
                    />
                    Bebas Pinjaman Perpustakaan (Bebas Pustaka)
                  </label>

                  <label class="flex items-center gap-3 text-xs font-bold text-secondary-700">
                    <input
                      type="checkbox"
                      checked={adminBebasLab()}
                      onChange={(e) => setAdminBebasLab(e.currentTarget.checked)}
                      class="w-4 h-4 text-brand-600 border-secondary-300 rounded focus:ring-brand-500 dark:border-secondary-700"
                    />
                    Bebas Inventaris Laboratorium / Bengkel
                  </label>

                  <label class="flex items-center gap-3 text-xs font-bold text-secondary-700">
                    <input
                      type="checkbox"
                      checked={adminBuktiPembayaranWisuda()}
                      onChange={(e) => setAdminBuktiPembayaranWisuda(e.currentTarget.checked)}
                      class="w-4 h-4 text-brand-600 border-secondary-300 rounded focus:ring-brand-500 dark:border-secondary-700"
                    />
                    Telah Melakukan Pembayaran Biaya Wisuda
                  </label>
                </div>

                <button
                  type="submit"
                  class="w-full py-2.5 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-accent-200 dark:bg-brand-700 dark:hover:bg-brand-600"
                >
                  Simpan Pengajuan Yudisium
                </button>
              </form>
            </div>
          </div>
        </Show>

        {/* --- ADMIN VERIFICATION MODAL --- */}
        <Show when={showVerifyModal()}>
          <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 dark:bg-secondary-900">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-secondary-800 text-sm dark:text-white">Verifikasi Pengajuan Yudisium</h3>
                <button onClick={() => setShowVerifyModal(false)} class="text-secondary-400 hover:text-secondary-600">
                  ❌
                </button>
              </div>

              <form onSubmit={handleAdminVerify} class="flex flex-col gap-4">
                <div class="text-xs text-secondary-600 flex flex-col gap-1 font-medium">
                  <p>
                    Nama:{' '}
                    <span class="font-bold text-secondary-800 dark:text-white">
                      {selectedSubmission()?.mahasiswa?.nama}
                    </span>
                  </p>
                  <p>
                    NIM:{' '}
                    <span class="font-bold text-secondary-800 dark:text-white">
                      {selectedSubmission()?.mahasiswa?.nim}
                    </span>
                  </p>
                  <p>
                    Prodi:{' '}
                    <span class="font-bold text-secondary-800 dark:text-white">
                      {selectedSubmission()?.prodi?.nama}
                    </span>
                  </p>
                  <p>
                    Judul TA:{' '}
                    <span class="font-bold text-secondary-800 dark:text-white">{selectedSubmission()?.judulTa}</span>
                  </p>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">Status Kelulusan Yudisium</label>
                  <select
                    class="border border-secondary-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 bg-white font-semibold dark:border-secondary-700 dark:text-white dark:bg-secondary-900"
                    value={adminStatus()}
                    onChange={(e) => setAdminStatus(e.currentTarget.value as any)}
                  >
                    <option value="diajukan">Diajukan</option>
                    <option value="diverifikasi">Diverifikasi</option>
                    <option value="disetujui">Disetujui (Dinyatakan LULUS)</option>
                    <option value="ditolak">Ditolak</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">Catatan / Keterangan</label>
                  <textarea
                    rows="3"
                    placeholder="Tulis alasan jika ditolak, atau catatan wisuda..."
                    value={adminCatatan()}
                    onInput={(e) => setAdminCatatan(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 resize-none text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  class="w-full py-2.5 bg-accent-600 text-white font-bold rounded-xl text-xs hover:bg-accent-700 active:scale-95 transition-all shadow-sm"
                >
                  Simpan Verifikasi
                </button>
              </form>
            </div>
          </div>
        </Show>

        {/* --- ADMIN SCALE PREDIKAT MODAL --- */}
        <Show when={showPredikatModal()}>
          <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 dark:bg-secondary-900">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-secondary-800 text-sm dark:text-white">
                  {predikatId() ? 'Edit Skala Predikat Kelulusan' : 'Tambah Skala Predikat Kelulusan'}
                </h3>
                <button onClick={() => setShowPredikatModal(false)} class="text-secondary-400 hover:text-secondary-600">
                  ❌
                </button>
              </div>

              <form onSubmit={handleSavePredikat} class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">IPK Minimum</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    max="4.00"
                    placeholder="Contoh: 3.51"
                    value={ipkMin()}
                    onInput={(e) => setIpkMin(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">IPK Maksimum</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    max="4.00"
                    placeholder="Contoh: 4.00"
                    value={ipkMax()}
                    onInput={(e) => setIpkMax(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">Predikat Kelulusan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Dengan Pujian (Cum Laude)"
                    value={predikatText()}
                    onInput={(e) => setPredikatText(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  class="w-full py-2.5 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm dark:bg-brand-700 dark:hover:bg-brand-600"
                >
                  Simpan Aturan Predikat
                </button>
              </form>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
