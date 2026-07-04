import { createSignal, createResource, Show, For, createEffect } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { khsController, PengajuanYudisium } from '../controllers/khsController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { MainLayout } from '../components/MainLayout';
import { useToast } from '../contexts/ToastContext';

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
    }
  );

  // Load student's own yudisium submission
  const [myYudisium, { refetch: refetchMyYudisium }] = createResource(
    () => mhsProfile()?.id,
    async (mhsId) => {
      if (!mhsId) return null;
      return await khsController.getPengajuanYudisium(mhsId);
    }
  );

  // Load all yudisium submissions (for Admin/Dosen/Prodi)
  const [allYudisium, { refetch: refetchAllYudisium }] = createResource(
    () => {
      if (role() === 'admin' || role() === 'dosen' || role() === 'prodi') return true;
      return null;
    },
    async () => {
      return await khsController.getAllYudisium();
    }
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
    }
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
    }
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
        buktiPembayaranWisuda: buktiPembayaranWisuda()
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
        buktiPembayaranWisuda: adminBuktiPembayaranWisuda()
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
        catatan: adminCatatan()
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
        predikat: predikatText()
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
        <div class="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-800">Evaluasi & Yudisium Wisuda</h1>
            <p class="text-sm text-gray-500 font-medium">Pengajuan yudisium wisuda, kelengkapan berkas administrasi, dan evaluasi kelulusan</p>
          </div>
        </div>

        {/* --- STUDENT VIEW --- */}
        <Show when={role() === 'mahasiswa'}>
          <Show when={!myYudisium.loading} fallback={<div class="text-center py-10 text-gray-400">Memuat data pengajuan...</div>}>
            <Show when={myYudisium() && !isEditMode()} fallback={
              <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-2xl">
                <div class="flex justify-between items-center border-b pb-2 mb-4">
                  <h3 class="font-bold text-gray-800">Form Pengajuan Yudisium Mandiri</h3>
                  <Show when={myYudisium()}>
                    <button 
                      onClick={() => setIsEditMode(false)}
                      class="px-3 py-1 bg-gray-100 hover:bg-gray-250 text-gray-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      Batal Edit
                    </button>
                  </Show>
                </div>
                <form onSubmit={handleStudentSubmit} class="flex flex-col gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-gray-700">Judul Tugas Akhir / Skripsi</label>
                    <textarea
                      rows="3"
                      placeholder="Tulis judul TA Anda secara lengkap..."
                      value={judulTa()}
                      onInput={(e) => setJudulTa(e.currentTarget.value)}
                      class="border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 resize-none text-slate-900"
                    />
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-gray-700">Skor TOEFL</label>
                    <input
                      type="number"
                      value={skorToefl()}
                      onInput={(e) => setSkorToefl(parseInt(e.currentTarget.value))}
                      class="border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-slate-900"
                    />
                  </div>

                  <div class="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-2.5">
                    <span class="text-xs uppercase font-extrabold tracking-wider text-gray-400">Deklarasi Mandiri Kelengkapan Administrasi:</span>
                    
                    <label class="flex items-center gap-3 text-xs font-bold text-gray-700">
                      <input
                        type="checkbox"
                        checked={bebasPerpustakaan()}
                        onChange={(e) => setBebasPerpustakaan(e.currentTarget.checked)}
                        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Bebas Pinjaman Perpustakaan (Bebas Pustaka)
                    </label>

                    <label class="flex items-center gap-3 text-xs font-bold text-gray-700">
                      <input
                        type="checkbox"
                        checked={bebasLab()}
                        onChange={(e) => setBebasLab(e.currentTarget.checked)}
                        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Bebas Inventaris Laboratorium / Bengkel
                    </label>

                    <label class="flex items-center gap-3 text-xs font-bold text-gray-700">
                      <input
                        type="checkbox"
                        checked={buktiPembayaranWisuda()}
                        onChange={(e) => setBuktiPembayaranWisuda(e.currentTarget.checked)}
                        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Telah Melakukan Pembayaran Biaya Wisuda
                    </label>
                  </div>

                  <button
                    type="submit"
                    class="px-5 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 self-start"
                  >
                    Ajukan Yudisium
                  </button>
                </form>
              </div>
            }>
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                  <div class="flex items-center justify-between border-b pb-2">
                    <h3 class="font-bold text-gray-800">Detail Pengajuan Yudisium</h3>
                    <span class={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      myYudisium()?.status === 'disetujui'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : myYudisium()?.status === 'ditolak'
                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      STATUS: {myYudisium()?.status?.toUpperCase()}
                    </span>
                  </div>

                  <div class="flex flex-col gap-3 text-sm text-gray-700 font-medium">
                    <div>
                      <span class="text-xs text-gray-400 block font-semibold">JUDUL TUGAS AKHIR / SKRIPSI</span>
                      <p class="font-bold text-gray-900 mt-0.5">{myYudisium()?.judulTa}</p>
                    </div>
                    <div>
                      <span class="text-xs text-gray-400 block font-semibold">SKOR TOEFL</span>
                      <p class="font-bold text-gray-900 mt-0.5">{myYudisium()?.skorToefl}</p>
                    </div>
                    <div>
                      <span class="text-xs text-gray-400 block font-semibold">BERKAS ADMINISTRASI</span>
                      <ul class="list-disc pl-5 mt-1 flex flex-col gap-1 text-xs">
                        <li>Bebas Pustaka: <span class={myYudisium()?.bebasPerpustakaan ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{myYudisium()?.bebasPerpustakaan ? 'TERPENUHI' : 'BELUM'}</span></li>
                        <li>Bebas Lab/Bengkel: <span class={myYudisium()?.bebasLab ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{myYudisium()?.bebasLab ? 'TERPENUHI' : 'BELUM'}</span></li>
                        <li>Bukti Bayar Wisuda: <span class={myYudisium()?.buktiPembayaranWisuda ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{myYudisium()?.buktiPembayaranWisuda ? 'TERPENUHI' : 'BELUM'}</span></li>
                      </ul>
                    </div>
                    <Show when={myYudisium()?.catatan}>
                      <div class="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs">
                        <span class="font-bold block mb-1">Catatan Verifikator:</span>
                        {myYudisium()?.catatan}
                      </div>
                    </Show>
                  </div>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                  <h3 class="font-bold text-gray-800 border-b pb-2">Update Berkas</h3>
                  <p class="text-xs text-gray-400">Anda dapat memperbarui judul TA atau checklist jika ada revisi berkas admin.</p>
                  <button
                    onClick={() => {
                      setIsEditMode(true);
                      toast.showToast('Silakan sesuaikan data pada form.', 'info');
                    }}
                    class="mt-2 py-2 bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors"
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
            <div class="flex gap-2 border-b border-gray-100 pb-3 mb-6">
              <button
                onClick={() => setActiveTab('pengajuan')}
                class={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab() === 'pengajuan'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-150'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Daftar Pengajuan
              </button>
              <button
                onClick={() => setActiveTab('predikat')}
                class={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab() === 'predikat'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-150'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Pengaturan Skala Predikat Kelulusan
              </button>
            </div>
          </Show>

          <Show when={activeTab() === 'pengajuan' || role() === 'dosen' || role() === 'prodi'}>
            <div class="flex justify-between items-center gap-4 bg-white/60 p-6 rounded-2xl border border-gray-100 shadow-sm mb-4">
              <h3 class="font-bold text-gray-800">Daftar Pengajuan Yudisium Mahasiswa</h3>
              <button
                onClick={() => setShowInputModal(true)}
                class="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-150"
              >
                ➕ Input Yudisium Mahasiswa
              </button>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase tracking-wider font-bold">
                    <th class="p-3">Mahasiswa</th>
                    <th class="p-3">Program Studi</th>
                    <th class="p-3">Judul TA</th>
                    <th class="p-3">Skor TOEFL</th>
                    <th class="p-3">Checklist Berkas</th>
                    <th class="p-3">Status</th>
                    <th class="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50 text-gray-600 font-medium">
                  <For each={allYudisium()} fallback={
                    <tr>
                      <td colspan="7" class="p-4 text-center text-gray-400 italic">Belum ada pengajuan yudisium terdaftar.</td>
                    </tr>
                  }>
                    {(item) => (
                      <tr class="hover:bg-gray-50/20">
                        <td class="p-3">
                          <div class="flex flex-col">
                            <span class="font-bold text-gray-800">{item.mahasiswa?.nama}</span>
                            <span class="text-[10px] text-gray-400">NIM: {item.mahasiswa?.nim}</span>
                          </div>
                        </td>
                        <td class="p-3">{item.prodi?.nama}</td>
                        <td class="p-3 max-w-[200px] truncate" title={item.judulTa}>{item.judulTa}</td>
                        <td class="p-3">{item.skorToefl}</td>
                        <td class="p-3 whitespace-nowrap">
                          <span class={`mr-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${item.bebasPerpustakaan ? 'bg-emerald-50 text-emerald-600 border' : 'bg-rose-50 text-rose-600 border'}`}>Pustaka</span>
                          <span class={`mr-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${item.bebasLab ? 'bg-emerald-50 text-emerald-600 border' : 'bg-rose-50 text-rose-600 border'}`}>Lab</span>
                          <span class={`px-1.5 py-0.5 rounded text-[9px] font-bold ${item.buktiPembayaranWisuda ? 'bg-emerald-50 text-emerald-600 border' : 'bg-rose-50 text-rose-600 border'}`}>Bayar</span>
                        </td>
                        <td class="p-3">
                          <span class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'disetujui'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : item.status === 'ditolak'
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td class="p-3">
                          <button
                            onClick={() => openVerifyModal(item)}
                            class="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg text-[10px] hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
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
            <div class="flex justify-between items-center gap-4 bg-white/60 p-6 rounded-2xl border border-gray-100 shadow-sm mb-4">
              <h3 class="font-bold text-gray-800">Skala Predikat Kelulusan Yudisium</h3>
              <button
                onClick={() => {
                  setPredikatId(null);
                  setIpkMin('');
                  setIpkMax('');
                  setPredikatText('');
                  setShowPredikatModal(true);
                }}
                class="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-150"
              >
                ➕ Tambah Skala Predikat
              </button>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase tracking-wider font-bold">
                    <th class="p-3">IPK Min</th>
                    <th class="p-3">IPK Max</th>
                    <th class="p-3">Predikat Kelulusan</th>
                    <th class="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50 text-gray-600 font-medium">
                  <For each={predikats()} fallback={
                    <tr>
                      <td colspan="4" class="p-4 text-center text-gray-400 italic">Belum ada aturan skala predikat kelulusan.</td>
                    </tr>
                  }>
                    {(pred) => (
                      <tr class="hover:bg-gray-50/20">
                        <td class="p-3 font-mono">{parseFloat(pred.ipkMin).toFixed(2)}</td>
                        <td class="p-3 font-mono">{parseFloat(pred.ipkMax).toFixed(2)}</td>
                        <td class="p-3 font-bold text-gray-800">{pred.predikat}</td>
                        <td class="p-3 flex gap-2">
                          <button
                            onClick={() => {
                              setPredikatId(pred.id);
                              setIpkMin(pred.ipkMin);
                              setIpkMax(pred.ipkMax);
                              setPredikatText(pred.predikat);
                              setShowPredikatModal(true);
                            }}
                            class="px-2.5 py-1 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePredikat(pred.id)}
                            class="px-2.5 py-1 bg-rose-50 text-rose-600 font-semibold rounded-lg hover:bg-rose-100 transition-colors"
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
          <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-gray-800 text-sm">Input Yudisium Mahasiswa (Admin)</h3>
                <button onClick={() => setShowInputModal(false)} class="text-gray-400 hover:text-gray-600">❌</button>
              </div>
              
              <form onSubmit={handleAdminSubmit} class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Pilih Mahasiswa</label>
                  <select
                    class="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 bg-white font-medium"
                    value={adminSelectedMhsId() || ''}
                    onChange={(e) => setAdminSelectedMhsId(parseInt(e.currentTarget.value))}
                  >
                    <option value="">-- Pilih Mahasiswa --</option>
                    <For each={studentsList()}>
                      {(student) => <option value={student.id}>{student.nama} ({student.nim})</option>}
                    </For>
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Judul Tugas Akhir / Skripsi</label>
                  <textarea
                    rows="3"
                    placeholder="Tulis judul Tugas Akhir..."
                    value={adminJudulTa()}
                    onInput={(e) => setAdminJudulTa(e.currentTarget.value)}
                    class="border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 resize-none text-slate-900"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Skor TOEFL</label>
                  <input
                    type="number"
                    value={adminSkorToefl()}
                    onInput={(e) => setAdminSkorToefl(parseInt(e.currentTarget.value))}
                    class="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>

                <div class="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-2.5">
                  <span class="text-xs uppercase font-extrabold tracking-wider text-gray-400">Verifikasi Kelengkapan Berkas:</span>
                  
                  <label class="flex items-center gap-3 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={adminBebasPerpustakaan()}
                      onChange={(e) => setAdminBebasPerpustakaan(e.currentTarget.checked)}
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Bebas Pinjaman Perpustakaan (Bebas Pustaka)
                  </label>

                  <label class="flex items-center gap-3 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={adminBebasLab()}
                      onChange={(e) => setAdminBebasLab(e.currentTarget.checked)}
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Bebas Inventaris Laboratorium / Bengkel
                  </label>

                  <label class="flex items-center gap-3 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={adminBuktiPembayaranWisuda()}
                      onChange={(e) => setAdminBuktiPembayaranWisuda(e.currentTarget.checked)}
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Telah Melakukan Pembayaran Biaya Wisuda
                  </label>
                </div>

                <button
                  type="submit"
                  class="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-150"
                >
                  Simpan Pengajuan Yudisium
                </button>
              </form>
            </div>
          </div>
        </Show>

        {/* --- ADMIN VERIFICATION MODAL --- */}
        <Show when={showVerifyModal()}>
          <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-gray-800 text-sm">Verifikasi Pengajuan Yudisium</h3>
                <button onClick={() => setShowVerifyModal(false)} class="text-gray-400 hover:text-gray-600">❌</button>
              </div>
              
              <form onSubmit={handleAdminVerify} class="flex flex-col gap-4">
                <div class="text-xs text-gray-600 flex flex-col gap-1 font-medium">
                  <p>Nama: <span class="font-bold text-gray-800">{selectedSubmission()?.mahasiswa?.nama}</span></p>
                  <p>NIM: <span class="font-bold text-gray-800">{selectedSubmission()?.mahasiswa?.nim}</span></p>
                  <p>Prodi: <span class="font-bold text-gray-800">{selectedSubmission()?.prodi?.nama}</span></p>
                  <p>Judul TA: <span class="font-bold text-gray-800">{selectedSubmission()?.judulTa}</span></p>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Tentukan Status</label>
                  <select
                    class="border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-slate-900 bg-white font-semibold"
                    value={adminStatus()}
                    onChange={(e) => setAdminStatus(e.currentTarget.value as any)}
                  >
                    <option value="diajukan">Diajukan</option>
                    <option value="diverifikasi">Diverifikasi</option>
                    <option value="disetujui">Disetujui (Lulus Yudisium)</option>
                    <option value="ditolak">Ditolak</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Catatan / Keterangan</label>
                  <textarea
                    rows="3"
                    placeholder="Tulis alasan jika ditolak, atau catatan revisi berkas..."
                    value={adminCatatan()}
                    onInput={(e) => setAdminCatatan(e.currentTarget.value)}
                    class="border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 resize-none text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  class="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                >
                  Simpan Status Verifikasi
                </button>
              </form>
            </div>
          </div>
        </Show>

        {/* --- ADMIN SCALE PREDIKAT MODAL --- */}
        <Show when={showPredikatModal()}>
          <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-gray-800 text-sm">
                  {predikatId() ? 'Edit Skala Predikat Kelulusan' : 'Tambah Skala Predikat Kelulusan'}
                </h3>
                <button onClick={() => setShowPredikatModal(false)} class="text-gray-400 hover:text-gray-600">❌</button>
              </div>

              <form onSubmit={handleSavePredikat} class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">IPK Minimum</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    max="4.00"
                    placeholder="Contoh: 3.51"
                    value={ipkMin()}
                    onInput={(e) => setIpkMin(e.currentTarget.value)}
                    class="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">IPK Maksimum</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    max="4.00"
                    placeholder="Contoh: 4.00"
                    value={ipkMax()}
                    onInput={(e) => setIpkMax(e.currentTarget.value)}
                    class="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Predikat Kelulusan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Dengan Pujian (Cum Laude)"
                    value={predikatText()}
                    onInput={(e) => setPredikatText(e.currentTarget.value)}
                    class="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  class="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
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
