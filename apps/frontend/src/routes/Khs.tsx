import { createSignal, createResource, Show, For, createEffect } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { khsController } from '../controllers/khsController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';

export default function Khs() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();
  const role = () => user()?.role;

  const [activeTab, setActiveTab] = createSignal<'khs' | 'transkrip'>('khs');
  const [selectedPeriode, setSelectedPeriode] = createSignal(''); // Dynamic Period selection

  // Load all academic periods
  const [periodes] = createResource(async () => {
    try {
      const res = await periodeAkademikController.getAll(undefined, 1, 100);
      return res.data;
    } catch (e) {
      return [];
    }
  });

  createEffect(() => {
    const list = periodes();
    if (list && list.length > 0) {
      const active = list.find(p => p.aktif);
      if (active) {
        setSelectedPeriode(active.id);
      } else {
        setSelectedPeriode(list[0].id);
      }
    }
  });

  // For Admin / Dosen view
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  const [searchNim, setSearchNim] = createSignal('');

  // Printing States
  const [showPrintUjian, setShowPrintUjian] = createSignal(false);
  const [showPrintKhs, setShowPrintKhs] = createSignal(false);
  const [showPrintTranskrip, setShowPrintTranskrip] = createSignal(false);

  // Load exam eligibility for print card
  const [eligibilityData] = createResource(
    () => {
      const mhsId = selectedMhsId();
      const pId = selectedPeriode();
      if (!mhsId || !showPrintUjian()) return null;
      return { mhsId, periodeId: pId };
    },
    async ({ mhsId, periodeId }) => {
      try {
        return await khsController.getExamEligibility(mhsId, periodeId);
      } catch (e) {
        return null;
      }
    }
  );

  // Load Mahasiswa profile if logged in as student
  const [mhsProfile] = createResource(
    () => {
      if (role() === 'mahasiswa') return user()?.email;
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await mahasiswaController.getAll(email, 1, 1);
      const profile = res.data[0] || null;
      if (profile) setSelectedMhsId(profile.id);
      return profile;
    }
  );

  // Search Mahasiswa (Admin/Dosen only)
  const [searchedStudents] = createResource(
    searchNim,
    async (nim) => {
      if (!nim) return [];
      const res = await mahasiswaController.getAll(nim, 1, 10);
      return res.data;
    }
  );

  const [khsData, { refetch: refetchKhs }] = createResource(
    () => {
      const mId = selectedMhsId();
      const pId = selectedPeriode();
      if (!mId) return null;
      return { mhsId: mId, periodeId: pId };
    },
    async ({ mhsId, periodeId }) => {
      return await khsController.getByMhsIdAndPeriode(mhsId, periodeId);
    }
  );

  // Load Transkrip
  const [transkripData, { refetch: refetchTranskrip }] = createResource(
    selectedMhsId,
    async (mhsId) => {
      if (!mhsId) return null;
      return await khsController.getTranskrip(mhsId);
    }
  );

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-800 tracking-tight">Hasil Studi Akademik</h1>
            <p class="text-sm text-gray-500">Kartu Hasil Studi (KHS) dan Transkrip Nilai Akademik Mahasiswa</p>
          </div>
          
          <div class="flex gap-2">
            <button
              onClick={() => setActiveTab('khs')}
              class={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab() === 'khs' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              KHS Semester
            </button>
            <button
              onClick={() => setActiveTab('transkrip')}
              class={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab() === 'transkrip' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Transkrip Nilai
            </button>
          </div>
        </div>

        {/* Admin/Dosen Student Selector */}
        <Show when={role() !== 'mahasiswa'}>
          <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <h3 class="font-bold text-gray-700 text-sm">Pilih Mahasiswa & Periode</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-500">Cari NIM / Nama</label>
                <input
                  type="text"
                  placeholder="Masukkan NIM atau Nama..."
                  value={searchNim()}
                  onInput={(e) => setSearchNim(e.currentTarget.value)}
                  class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-500">Pilih dari Hasil Pencarian</label>
                <select
                  onChange={(e) => {
                    const id = parseInt(e.currentTarget.value);
                    setSelectedMhsId(id || null);
                  }}
                  class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Pilih Mahasiswa --</option>
                  <For each={searchedStudents()}>
                    {(item) => (
                      <option value={item.id} selected={selectedMhsId() === item.id}>
                        {item.nim} - {item.nama}
                      </option>
                    )}
                  </For>
                </select>
              </div>

              <Show when={activeTab() === 'khs'}>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-gray-500">Pilih Periode</label>
                  <select
                    value={selectedPeriode()}
                    onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
                    class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-500"
                  >
                    <For each={periodes()}>
                      {(p) => <option value={p.id}>{p.nama}</option>}
                    </For>
                  </select>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Student Period Selector */}
        <Show when={role() === 'mahasiswa' && activeTab() === 'khs'}>
          <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <span class="text-sm font-bold text-gray-700">Periode Akademik:</span>
            <select
              value={selectedPeriode()}
              onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
              class="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500"
            >
              <For each={periodes()}>
                {(p) => <option value={p.id}>{p.nama}</option>}
              </For>
            </select>
          </div>
        </Show>



        {/* Content Area */}
        <Show when={selectedMhsId()} fallback={
            <div class="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center text-gray-400">
              Silakan cari dan pilih mahasiswa terlebih dahulu untuk menampilkan data akademik.
            </div>
          }>
            <Show when={activeTab() === 'khs'}>
              <Show when={khsData.loading}>
                <div class="text-center py-12 text-gray-400">Memuat data KHS...</div>
              </Show>

              <Show when={!khsData.loading && khsData()}>
                <Show
                  when={khsData()?.blocked}
                  fallback={
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Summary Cards */}
                      <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">IP Semester</span>
                          <span class="text-3xl font-extrabold text-blue-600">{khsData()?.summary?.ipSemester?.toFixed(2)}</span>
                        </div>
                        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">IPK Kumulatif</span>
                          <span class="text-3xl font-extrabold text-indigo-600">{khsData()?.summary?.ipk?.toFixed(2)}</span>
                        </div>
                        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">SKS Terkontrak</span>
                          <span class="text-3xl font-extrabold text-gray-800">{khsData()?.summary?.totalSks} SKS</span>
                        </div>
                        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">SKS Kumulatif</span>
                          <span class="text-3xl font-extrabold text-gray-800">{khsData()?.summary?.totalSksKumulatif} SKS</span>
                        </div>
                      </div>

                      {/* KHS Table */}
                      <div class="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 overflow-x-auto">
                        <div class="flex justify-between items-center border-b pb-2">
                          <h3 class="font-bold text-gray-800">Rincian Mata Kuliah & Nilai</h3>
                          <div class="flex gap-2">
                            <button
                              onClick={() => setShowPrintUjian(true)}
                              disabled={khsData()?.blocked}
                              class="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all shadow-sm shadow-blue-100"
                            >
                              🖨️ Cetak Kartu Ujian
                            </button>
                            <button
                              onClick={() => setShowPrintKhs(true)}
                              disabled={khsData()?.blocked}
                              class="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all shadow-sm shadow-blue-100"
                            >
                              🖨️ Cetak KHS
                            </button>
                          </div>
                        </div>

                        <table class="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr class="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase tracking-wider font-bold">
                              <th class="p-3">Kode MK</th>
                              <th class="p-3">Nama Mata Kuliah</th>
                              <th class="p-3">SKS</th>
                              <th class="p-3">Nilai Angka</th>
                              <th class="p-3">Nilai Huruf</th>
                              <th class="p-3">Nilai Indeks</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-gray-50 text-gray-600 font-medium">
                            <For each={khsData()?.krsList} fallback={
                              <tr>
                                <td colspan="6" class="p-4 text-center text-gray-400 italic">Nilai belum dimasukkan atau belum disetujui Dosen PA.</td>
                              </tr>
                            }>
                              {(item) => (
                                <tr class="hover:bg-gray-50/20">
                                  <td class="p-3 whitespace-nowrap">{item.mataKuliah?.kode}</td>
                                  <td class="p-3 font-bold text-gray-800">{item.mataKuliah?.nama}</td>
                                  <td class="p-3">{item.mataKuliah?.sksTotal}</td>
                                  <td class="p-3">{item.nilaiAngka || '-'}</td>
                                  <td class="p-3">
                                    <Show when={item.nilaiHuruf} fallback="-">
                                      <span class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        item.nilaiHuruf === 'A' || item.nilaiHuruf === 'B+' || item.nilaiHuruf === 'B'
                                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                          : item.nilaiHuruf === 'C+' || item.nilaiHuruf === 'C'
                                          ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                          : 'bg-rose-50 text-rose-600 border border-rose-100'
                                      }`}>
                                        {item.nilaiHuruf}
                                      </span>
                                    </Show>
                                  </td>
                                  <td class="p-3">{item.nilaiIndeks || '-'}</td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                >
                  {/* Blocked View */}
                  <div class="bg-rose-50 border border-rose-200 p-8 rounded-2xl text-rose-800 shadow-sm flex flex-col items-center justify-center text-center gap-4 max-w-2xl mx-auto my-8">
                    <span class="text-5xl">🔒</span>
                    <h2 class="text-xl font-extrabold tracking-tight text-rose-900">Akses KHS Diblokir Sementara</h2>
                    <p class="text-sm font-medium leading-relaxed max-w-md text-rose-700">
                      Sesuai dengan ketentuan Buku Panduan Akademik, Anda harus melunasi seluruh kewajiban administrasi sebelum dapat mengakses nilai akhir KHS.
                    </p>
                    <div class="bg-white border border-rose-100 rounded-xl p-4 w-full text-left flex flex-col gap-1.5 shadow-sm">
                      <span class="text-xs uppercase font-extrabold tracking-wider text-rose-500">Penyebab Blokir:</span>
                      <p class="text-xs font-bold text-gray-700">{khsData()?.reason}</p>
                      <p class="text-xs text-gray-500 font-medium">{khsData()?.detail}</p>
                    </div>
                    <p class="text-xs text-rose-600 font-bold mt-2">Silakan hubungi Bagian Keuangan atau BAAK untuk melakukan penyelesaian tanggungan.</p>
                  </div>
                </Show>
              </Show>
            </Show>

            <Show when={activeTab() === 'transkrip'}>
              <Show when={transkripData.loading}>
                <div class="text-center py-12 text-gray-400">Memuat Transkrip...</div>
              </Show>

              <Show when={!transkripData.loading && transkripData()}>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                      <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">IPK Kumulatif (Transcript)</span>
                      <span class="text-3xl font-extrabold text-blue-600">{transkripData()?.summary?.ipk?.toFixed(2)}</span>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                      <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">Total SKS Lulus</span>
                      <span class="text-3xl font-extrabold text-indigo-600">{transkripData()?.summary?.totalSks} SKS</span>
                    </div>
                  </div>

                  <div class="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 overflow-x-auto">
                    <div class="flex justify-between items-center border-b pb-2">
                      <h3 class="font-bold text-gray-800">Transkrip Nilai Akademik Kumulatif</h3>
                      <button
                        onClick={() => setShowPrintTranskrip(true)}
                        class="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-100"
                      >
                        🖨️ Cetak Transkrip
                      </button>
                    </div>

                    <table class="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr class="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase tracking-wider font-bold">
                          <th class="p-3">Semester</th>
                          <th class="p-3">Kode MK</th>
                          <th class="p-3">Nama Mata Kuliah</th>
                          <th class="p-3">SKS</th>
                          <th class="p-3">Nilai Angka</th>
                          <th class="p-3">Nilai Huruf</th>
                          <th class="p-3">Nilai Indeks</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-50 text-gray-600 font-medium">
                        <For each={transkripData()?.transkripList} fallback={
                          <tr>
                            <td colspan="7" class="p-4 text-center text-gray-400 italic">Belum ada nilai akademik terdaftar dalam transkrip.</td>
                          </tr>
                        }>
                          {(item) => (
                            <tr class="hover:bg-gray-50/20">
                              <td class="p-3 font-semibold text-gray-500">{item.periodeId}</td>
                              <td class="p-3 whitespace-nowrap">{item.mataKuliah?.kode}</td>
                              <td class="p-3 font-bold text-gray-800">{item.mataKuliah?.nama}</td>
                              <td class="p-3">{item.mataKuliah?.sksTotal}</td>
                              <td class="p-3">{item.nilaiAngka || '-'}</td>
                              <td class="p-3">
                                <Show when={item.nilaiHuruf} fallback="-">
                                  <span class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.nilaiHuruf === 'A' || item.nilaiHuruf === 'B+' || item.nilaiHuruf === 'B'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                                  }`}>
                                    {item.nilaiHuruf}
                                  </span>
                                </Show>
                              </td>
                              <td class="p-3">{item.nilaiIndeks || '-'}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Show>
            </Show>
          </Show>

        {/* PRINTABLE OVERLAY MODALS */}
        <Show when={showPrintUjian()}>
          <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-0">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 flex flex-col gap-4 print:shadow-none print:p-0">
              <div class="flex justify-between items-center border-b pb-2 print:hidden">
                <h3 class="font-bold text-gray-800">Print Preview - Kartu Ujian</h3>
                <button onClick={() => setShowPrintUjian(false)} class="text-gray-400 hover:text-gray-650">❌</button>
              </div>
              
              <div class="flex flex-col gap-4 text-gray-850" id="print-area-ujian">
                <div class="text-center border-b pb-3 flex flex-col gap-1">
                  <h2 class="text-xl font-extrabold text-blue-700 tracking-wider">POLITEKNIK SOROWAKO</h2>
                  <h3 class="text-sm font-bold text-gray-600 uppercase tracking-widest">KARTU UJIAN MAHASISWA (UTS/UAS)</h3>
                  <p class="text-xs text-gray-400">Periode Akademik: {selectedPeriode()}</p>
                </div>

                <div class="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-600 mb-2">
                  <div>
                    <p>NIM: <span class="text-gray-900 font-bold">{mhsProfile()?.nim || 'N/A'}</span></p>
                    <p>Nama: <span class="text-gray-900 font-bold">{mhsProfile()?.nama || 'N/A'}</span></p>
                  </div>
                  <div class="text-right">
                    <p>Bimbingan PA: <span class={`font-bold ${eligibilityData()?.bimbingan?.eligible ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {eligibilityData()?.bimbingan?.eligible ? 'TERPENUHI' : 'BELUM TERPENUHI'}
                    </span></p>
                  </div>
                </div>

                <table class="w-full text-left text-xs border border-gray-200 border-collapse">
                  <thead>
                    <tr class="bg-gray-50 text-gray-500 font-bold uppercase border-b border-gray-200">
                      <th class="p-2 border-r">Kode</th>
                      <th class="p-2 border-r">Mata Kuliah</th>
                      <th class="p-2 border-r text-center">Kehadiran</th>
                      <th class="p-2 text-center">Status Kelayakan</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 font-medium text-gray-700">
                    <For each={eligibilityData()?.classes} fallback={
                      <tr>
                        <td colspan="4" class="p-4 text-center text-gray-400 italic">Memuat data kelayakan ujian...</td>
                      </tr>
                    }>
                      {(c) => (
                        <tr>
                          <td class="p-2 border-r">{c.mataKuliahKode}</td>
                          <td class="p-2 border-r font-bold text-gray-800">{c.mataKuliahNama} ({c.namaKelas})</td>
                          <td class="p-2 border-r text-center">{c.attendanceRate}% ({c.presentMeetings}/{c.totalMeetings})</td>
                          <td class="p-2 text-center">
                            <span class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.eligible ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                              {c.eligible ? 'LAYAK' : 'TIDAK LAYAK'}
                            </span>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="flex justify-end gap-3 mt-4 border-t pt-4 print:hidden">
                <button
                  onClick={() => setShowPrintUjian(false)}
                  class="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  class="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                >
                  🖨️ Cetak Sekarang
                </button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={showPrintKhs()}>
          <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-0">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 flex flex-col gap-4 print:shadow-none print:p-0">
              <div class="flex justify-between items-center border-b pb-2 print:hidden">
                <h3 class="font-bold text-gray-800">Print Preview - KHS</h3>
                <button onClick={() => setShowPrintKhs(false)} class="text-gray-400 hover:text-gray-650">❌</button>
              </div>
              
              <div class="flex flex-col gap-4 text-gray-850" id="print-area-khs">
                <div class="text-center border-b pb-3 flex flex-col gap-1">
                  <h2 class="text-xl font-extrabold text-blue-700 tracking-wider">POLITEKNIK SOROWAKO</h2>
                  <h3 class="text-sm font-bold text-gray-600 uppercase tracking-widest">KARTU HASIL STUDI (KHS) SEMESTER</h3>
                  <p class="text-xs text-gray-400">Periode Akademik: {selectedPeriode()}</p>
                </div>

                <div class="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-600 mb-2">
                  <div>
                    <p>NIM: <span class="text-gray-900 font-bold">{mhsProfile()?.nim || 'N/A'}</span></p>
                    <p>Nama: <span class="text-gray-900 font-bold">{mhsProfile()?.nama || 'N/A'}</span></p>
                  </div>
                  <div class="text-right">
                    <p>IP Semester: <span class="text-gray-900 font-extrabold text-blue-600">{khsData()?.summary?.ipSemester?.toFixed(2)}</span></p>
                    <p>SKS Terkontrak: <span class="text-gray-900 font-bold">{khsData()?.summary?.totalSks} SKS</span></p>
                  </div>
                </div>

                <table class="w-full text-left text-xs border border-gray-200 border-collapse">
                  <thead>
                    <tr class="bg-gray-50 text-gray-500 font-bold uppercase border-b border-gray-200">
                      <th class="p-2 border-r">Kode MK</th>
                      <th class="p-2 border-r">Nama Mata Kuliah</th>
                      <th class="p-2 border-r text-center">SKS</th>
                      <th class="p-2 border-r text-center">Nilai Angka</th>
                      <th class="p-2 border-r text-center">Nilai Huruf</th>
                      <th class="p-2 text-center">Nilai Indeks</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 font-medium text-gray-700">
                    <For each={khsData()?.krsList}>
                      {(item) => (
                        <tr>
                          <td class="p-2 border-r">{item.mataKuliah?.kode}</td>
                          <td class="p-2 border-r font-bold text-gray-800">{item.mataKuliah?.nama}</td>
                          <td class="p-2 border-r text-center">{item.mataKuliah?.sksTotal}</td>
                          <td class="p-2 border-r text-center">{item.nilaiAngka || '-'}</td>
                          <td class="p-2 border-r text-center">{item.nilaiHuruf || '-'}</td>
                          <td class="p-2 text-center">{item.nilaiIndeks || '-'}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="flex justify-end gap-3 mt-4 border-t pt-4 print:hidden">
                <button
                  onClick={() => setShowPrintKhs(false)}
                  class="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  class="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                >
                  🖨️ Cetak Sekarang
                </button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={showPrintTranskrip()}>
          <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-0">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 flex flex-col gap-4 print:shadow-none print:p-0">
              <div class="flex justify-between items-center border-b pb-2 print:hidden">
                <h3 class="font-bold text-gray-800">Print Preview - Transkrip Akademik</h3>
                <button onClick={() => setShowPrintTranskrip(false)} class="text-gray-400 hover:text-gray-650">❌</button>
              </div>
              
              <div class="flex flex-col gap-4 text-gray-850" id="print-area-transkrip">
                <div class="text-center border-b pb-3 flex flex-col gap-1">
                  <h2 class="text-xl font-extrabold text-blue-700 tracking-wider">POLITEKNIK SOROWAKO</h2>
                  <h3 class="text-sm font-bold text-gray-600 uppercase tracking-widest">TRANSKRIP NILAI AKADEMIK KUMULATIF</h3>
                </div>

                <div class="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-600 mb-2">
                  <div>
                    <p>NIM: <span class="text-gray-900 font-bold">{mhsProfile()?.nim || 'N/A'}</span></p>
                    <p>Nama: <span class="text-gray-900 font-bold">{mhsProfile()?.nama || 'N/A'}</span></p>
                  </div>
                  <div class="text-right">
                    <p>IPK Kumulatif: <span class="text-gray-900 font-extrabold text-blue-600">{transkripData()?.summary?.ipk?.toFixed(2)}</span></p>
                    <p>Total SKS Lulus: <span class="text-gray-900 font-bold">{transkripData()?.summary?.totalSks} SKS</span></p>
                  </div>
                </div>

                <table class="w-full text-left text-xs border border-gray-200 border-collapse">
                  <thead>
                    <tr class="bg-gray-50 text-gray-500 font-bold uppercase border-b border-gray-200">
                      <th class="p-2 border-r">Semester</th>
                      <th class="p-2 border-r">Kode MK</th>
                      <th class="p-2 border-r">Nama Mata Kuliah</th>
                      <th class="p-2 border-r text-center">SKS</th>
                      <th class="p-2 border-r text-center">Nilai Angka</th>
                      <th class="p-2 border-r text-center">Nilai Huruf</th>
                      <th class="p-2 text-center">Nilai Indeks</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 font-medium text-gray-700">
                    <For each={transkripData()?.transkripList}>
                      {(item) => (
                        <tr>
                          <td class="p-2 border-r">{item.periodeId}</td>
                          <td class="p-2 border-r">{item.mataKuliah?.kode}</td>
                          <td class="p-2 border-r font-bold text-gray-800">{item.mataKuliah?.nama}</td>
                          <td class="p-2 border-r text-center">{item.mataKuliah?.sksTotal}</td>
                          <td class="p-2 border-r text-center">{item.nilaiAngka || '-'}</td>
                          <td class="p-2 border-r text-center">{item.nilaiHuruf || '-'}</td>
                          <td class="p-2 text-center">{item.nilaiIndeks || '-'}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="flex justify-end gap-3 mt-4 border-t pt-4 print:hidden">
                <button
                  onClick={() => setShowPrintTranskrip(false)}
                  class="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  class="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                >
                  🖨️ Cetak Sekarang
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
