import { createSignal, createResource, Show, For } from 'solid-js';
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

  // Load all yudisium submissions (for Admin/Dosen)
  const [allYudisium, { refetch: refetchAllYudisium }] = createResource(
    () => {
      if (role() === 'admin' || role() === 'dosen') return true;
      return null;
    },
    async () => {
      return await khsController.getAllYudisium();
    }
  );

  // Load all students list (for Admin Input Dropdown)
  const [studentsList] = createResource(
    () => {
      if (role() === 'admin' || role() === 'dosen') return true;
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

  const initializeStudentForm = () => {
    const data = myYudisium();
    if (data) {
      setJudulTa(data.judulTa || '');
      setSkorToefl(data.skorToefl || 450);
      setBebasPerpustakaan(data.bebasPerpustakaan || false);
      setBebasLab(data.bebasLab || false);
      setBuktiPembayaranWisuda(data.buktiPembayaranWisuda || false);
    }
    return '';
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
            <Show when={myYudisium()} fallback={
              <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-2xl">
                <h3 class="font-bold text-gray-800 border-b pb-2 mb-4">Form Pengajuan Yudisium Mandiri</h3>
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
              {/* Show Submitted Status */}
              {initializeStudentForm()}
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
                        <li>Bebas Pustaka: <span class={myYudisium()?.bebasPerpustakaan ? 'text-emerald-650 font-bold' : 'text-rose-650 font-bold'}>{myYudisium()?.bebasPerpustakaan ? 'TERPENUHI' : 'BELUM'}</span></li>
                        <li>Bebas Lab/Bengkel: <span class={myYudisium()?.bebasLab ? 'text-emerald-650 font-bold' : 'text-rose-650 font-bold'}>{myYudisium()?.bebasLab ? 'TERPENUHI' : 'BELUM'}</span></li>
                        <li>Bukti Bayar Wisuda: <span class={myYudisium()?.buktiPembayaranWisuda ? 'text-emerald-650 font-bold' : 'text-rose-650 font-bold'}>{myYudisium()?.buktiPembayaranWisuda ? 'TERPENUHI' : 'BELUM'}</span></li>
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
                      // Allow re-edit by forcing show form via state clearing
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

        {/* --- ADMIN & DOSEN VIEW --- */}
        <Show when={role() === 'admin' || role() === 'dosen'}>
          <div class="flex justify-between items-center gap-4 bg-white/60 p-6 rounded-2xl border border-gray-100 shadow-sm">
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
                <button onClick={() => setShowVerifyModal(false)} class="text-gray-400 hover:text-gray-650">❌</button>
              </div>
              
              <form onSubmit={handleAdminVerify} class="flex flex-col gap-4">
                <div class="text-xs text-gray-600 flex flex-col gap-1 font-medium">
                  <p>Nama: <span class="font-bold text-gray-850">{selectedSubmission()?.mahasiswa?.nama}</span></p>
                  <p>NIM: <span class="font-bold text-gray-850">{selectedSubmission()?.mahasiswa?.nim}</span></p>
                  <p>Prodi: <span class="font-bold text-gray-850">{selectedSubmission()?.prodi?.nama}</span></p>
                  <p>Judul TA: <span class="font-bold text-gray-850">{selectedSubmission()?.judulTa}</span></p>
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
      </div>
    </MainLayout>
  );
}
