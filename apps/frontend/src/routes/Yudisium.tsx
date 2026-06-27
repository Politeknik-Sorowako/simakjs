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

  // Form states for Student Submission
  const [judulTa, setJudulTa] = createSignal('');
  const [skorToefl, setSkorToefl] = createSignal(450);
  const [bebasPerpustakaan, setBebasPerpustakaan] = createSignal(false);
  const [bebasLab, setBebasLab] = createSignal(false);
  const [buktiPembayaranWisuda, setBuktiPembayaranWisuda] = createSignal(false);

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

  // Open Verify Modal for Admin
  const openVerifyModal = (item: PengajuanYudisium) => {
    setSelectedSubmission(item);
    setAdminStatus(item.status);
    setAdminCatatan(item.catatan || '');
    setBebasPerpustakaan(item.bebasPerpustakaan);
    setBebasLab(item.bebasLab);
    setBuktiPembayaranWisuda(item.buktiPembayaranWisuda);
    setShowVerifyModal(true);
  };

  // Handle admin verify / update yudisium
  const handleAdminVerify = async (e: Event) => {
    e.preventDefault();
    const item = selectedSubmission();
    if (!item) return;

    try {
      // First update yudisium details (like checklists) by mimicking yudisium submit for the student
      await khsController.submitPengajuanYudisium(item.mahasiswaId, {
        judulTa: item.judulTa,
        skorToefl: item.skorToefl,
        bebasPerpustakaan: bebasPerpustakaan(),
        bebasLab: bebasLab(),
        buktiPembayaranWisuda: buktiPembayaranWisuda()
      });

      // Then update status and notes
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

  // Load existing data to student form if exists
  const initializeStudentForm = () => {
    const data = myYudisium();
    if (data) {
      setJudulTa(data.judulTa);
      setSkorToefl(data.skorToefl);
      setBebasPerpustakaan(data.bebasPerpustakaan);
      setBebasLab(data.bebasLab);
      setBuktiPembayaranWisuda(data.buktiPembayaranWisuda);
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-800 tracking-tight">Evaluasi Yudisium</h1>
            <p class="text-sm text-gray-500">Pengajuan yudisium wisuda, kelengkapan berkas administrasi, dan evaluasi kelulusan</p>
          </div>
        </div>

        {/* --- STUDENT VIEW --- */}
        <Show when={role() === 'mahasiswa'}>
          <Show when={myYudisium()} fallback={
            <div class="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
              <h3 class="font-bold text-gray-800 border-b pb-2">Formulir Pengajuan Yudisium</h3>
              <form onSubmit={handleStudentSubmit} class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Judul Tugas Akhir / Proyek Akhir</label>
                  <textarea
                    rows="3"
                    placeholder="Tulis judul TA Anda secara lengkap..."
                    value={judulTa()}
                    onInput={(e) => setJudulTa(e.currentTarget.value)}
                    class="border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Skor TOEFL</label>
                  <input
                    type="number"
                    value={skorToefl()}
                    onInput={(e) => setSkorToefl(parseInt(e.currentTarget.value))}
                    class="border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500"
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
                    Status: {myYudisium()?.status?.toUpperCase()}
                  </span>
                </div>

                <div class="flex flex-col gap-2.5 text-xs font-medium text-gray-600">
                  <p><strong class="text-gray-800">Judul TA:</strong> {myYudisium()?.judulTa}</p>
                  <p><strong class="text-gray-800">Skor TOEFL:</strong> {myYudisium()?.skorToefl}</p>
                  <p><strong class="text-gray-800">Bebas Perpustakaan:</strong> {myYudisium()?.bebasPerpustakaan ? '✅ Bebas' : '❌ Belum Bebas'}</p>
                  <p><strong class="text-gray-800">Bebas Lab:</strong> {myYudisium()?.bebasLab ? '✅ Bebas' : '❌ Belum Bebas'}</p>
                  <p><strong class="text-gray-800">Bukti Pembayaran Wisuda:</strong> {myYudisium()?.buktiPembayaranWisuda ? '✅ Terverifikasi' : '❌ Belum Bayar'}</p>
                </div>

                <Show when={myYudisium()?.catatan}>
                  <div class="p-4 bg-gray-50 border rounded-xl text-xs text-gray-500 font-medium">
                    <strong class="text-gray-700">Catatan Verifikator:</strong>
                    <p class="mt-1">{myYudisium()?.catatan}</p>
                  </div>
                </Show>

                <Show when={myYudisium()?.status === 'ditolak' || myYudisium()?.status === 'diajukan'}>
                  <button
                    onClick={() => {
                      // Trigger update/resubmit
                      refetchMyYudisium();
                    }}
                    class="px-4 py-2 border border-blue-600 text-blue-600 font-bold rounded-xl text-xs hover:bg-blue-50 active:scale-95 transition-all self-start mt-2"
                  >
                    Simpan Perubahan / Ajukan Ulang
                  </button>
                </Show>
              </div>

              {/* Status Study Card */}
              <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                <h3 class="font-bold text-gray-800 border-b pb-2">Status Evaluasi Studi</h3>
                <div class="flex flex-col items-center justify-center py-6 gap-2">
                  <span class="text-xs uppercase font-extrabold tracking-wider text-gray-400">Status Akademik Anda:</span>
                  <span class={`text-3xl font-extrabold uppercase ${
                    mhsProfile()?.status === 'lulus' ? 'text-emerald-600' : 'text-blue-600'
                  }`}>
                    {mhsProfile()?.status}
                  </span>
                  <Show when={mhsProfile()?.status === 'lulus'}>
                    <span class="text-[10px] text-emerald-600 font-bold text-center px-4">Selamat! Anda telah dinyatakan lulus Yudisium dan siap untuk Wisuda.</span>
                  </Show>
                </div>
              </div>
            </div>
          </Show>
        </Show>

        {/* --- ADMIN & DOSEN VIEW --- */}
        <Show when={role() === 'admin' || role() === 'dosen'}>
          <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <h3 class="font-bold text-gray-800 border-b pb-2 mb-4">Pengajuan Yudisium Mahasiswa</h3>
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

        {/* --- ADMIN VERIFICATION MODAL --- */}
        <Show when={showVerifyModal() && selectedSubmission()}>
          <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
              <h3 class="font-bold text-gray-800 border-b pb-2">Verifikasi Yudisium Mahasiswa</h3>
              
              <div class="text-xs font-semibold text-gray-500 flex flex-col gap-1">
                <p>NIM: {selectedSubmission()?.mahasiswa?.nim}</p>
                <p>Nama: {selectedSubmission()?.mahasiswa?.nama}</p>
                <p>Judul TA: "{selectedSubmission()?.judulTa}"</p>
                <p>Skor TOEFL: {selectedSubmission()?.skorToefl}</p>
              </div>

              <form onSubmit={handleAdminVerify} class="flex flex-col gap-4">
                <div class="p-3 bg-gray-50 border rounded-xl flex flex-col gap-2">
                  <span class="text-[10px] uppercase font-extrabold tracking-wider text-gray-400">Verifikasi Dokumen:</span>
                  
                  <label class="flex items-center gap-3 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={bebasPerpustakaan()}
                      onChange={(e) => setBebasPerpustakaan(e.currentTarget.checked)}
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Bebas Perpustakaan
                  </label>

                  <label class="flex items-center gap-3 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={bebasLab()}
                      onChange={(e) => setBebasLab(e.currentTarget.checked)}
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Bebas Laboratorium
                  </label>

                  <label class="flex items-center gap-3 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={buktiPembayaranWisuda()}
                      onChange={(e) => setBuktiPembayaranWisuda(e.currentTarget.checked)}
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Bukti Pembayaran Wisuda
                  </label>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Status Kelulusan Yudisium</label>
                  <select
                    value={adminStatus()}
                    onChange={(e) => setAdminStatus(e.currentTarget.value as any)}
                    class="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
                  >
                    <option value="diajukan">Diajukan</option>
                    <option value="diverifikasi">Diverifikasi (Dokumen Oke)</option>
                    <option value="disetujui">Disetujui (Dinyatakan LULUS)</option>
                    <option value="ditolak">Ditolak / Perlu Perbaikan</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Catatan / Keterangan</label>
                  <textarea
                    rows="3"
                    placeholder="Tulis alasan jika ditolak, atau catatan wisuda..."
                    value={adminCatatan()}
                    onInput={(e) => setAdminCatatan(e.currentTarget.value)}
                    class="border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div class="flex justify-end gap-3 mt-2 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(false)}
                    class="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    class="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-100"
                  >
                    Simpan Verifikasi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
