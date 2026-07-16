import { createResource, createSignal, For, Show } from 'solid-js';
import { BarChart, LineChart, PieChart, StatCard } from '../components/charts';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { bimbinganController } from '../controllers/bimbinganController';
import { dosenController } from '../controllers/dosenController';
import { dosenPengajarController } from '../controllers/dosenPengajarController';
import { khsController } from '../controllers/khsController';
import { krsController } from '../controllers/krsController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { presensiController } from '../controllers/presensiController';
import { prodiController } from '../controllers/prodiController';
import { tagihanController } from '../controllers/tagihanController';

// ─── Helpers ────────────────────────────────────────────────────────
function formatRupiah(num: number) {
  return `Rp ${num.toLocaleString('id-ID')}`;
}

// ─── Admin Dashboard Widgets ────────────────────────────────────────
function AdminWidgets() {
  const workspace = useWorkspace();

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 1));
  const [dosens] = createResource(() => dosenController.getAll(undefined, 1, 1));
  const [mahasiswas] = createResource(() => mahasiswaController.getAll(undefined, 1, 1));
  const [pddiktiStats] = createResource(() => khsController.getPddiktiStats());

  const [tagihanData] = createResource(
    async () => {
      const res = await tagihanController.getAll('', undefined, 1, 1000);
      return res.data;
    },
    { initialValue: [] },
  );

  const [periodeAktif] = createResource(async () => {
    const res = await periodeAkademikController.getAll('', 1, 50);
    return res.data.find((p: any) => p.aktif);
  });

  const [pendingKrs] = createResource(
    () => periodeAktif()?.id,
    async (periodeId) => {
      if (!periodeId) return [];
      try {
        return await krsController.getPendingStudents(periodeId);
      } catch {
        return [];
      }
    },
  );

  const tagihanStats = () => {
    const items = tagihanData();
    const total = items.length;
    const lunas = items.filter((t) => t.status === 'lunas').length;
    const cicilan = items.filter((t) => t.status === 'cicilan').length;
    const belumBayar = items.filter((t) => t.status === 'belum_bayar').length;
    const totalNominal = items.reduce((s, t) => s + t.nominal, 0);
    const totalTerbayar = items.reduce((s, t) => s + (t.nominalTerbayar || 0), 0);
    return { total, lunas, cicilan, belumBayar, totalNominal, totalTerbayar };
  };

  return (
    <div class="flex flex-col gap-6">
      {/* Baris 1: Stat Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Program Studi"
          value={prodis.loading ? '...' : prodis()?.meta.total || 0}
          icon={
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
          color="brand"
          href="/program-studi"
        />
        <StatCard
          title="Dosen Pengajar"
          value={dosens.loading ? '...' : dosens()?.meta.total || 0}
          icon={
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          color="accent"
          href="/dosen"
        />
        <StatCard
          title="Mahasiswa"
          value={mahasiswas.loading ? '...' : mahasiswas()?.meta.total || 0}
          subtitle={`${tagihanStats().total > 0 ? `${tagihanStats().lunas} lunas` : ''}`}
          icon={
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
              />
            </svg>
          }
          color="green"
          href="/mahasiswa"
        />
        <StatCard
          title="KRS Pending"
          value={pendingKrs.loading ? '...' : pendingKrs()?.length || 0}
          subtitle={periodeAktif() ? `Periode ${periodeAktif()?.nama}` : ''}
          icon={
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          color={pendingKrs()?.length > 0 ? 'yellow' : 'green'}
          href="/krs"
        />
      </div>

      {/* Baris 2: Charts */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tagihan Status */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
          <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Status Pembayaran Mahasiswa</h3>
          <Show
            when={tagihanStats().total > 0}
            fallback={<p class="text-xs text-secondary-400 text-center py-8">Belum ada data tagihan</p>}
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PieChart
                labels={['Lunas', 'Cicilan', 'Belum Bayar']}
                data={[tagihanStats().lunas, tagihanStats().cicilan, tagihanStats().belumBayar]}
                height={200}
                donut
              />
              <div class="flex flex-col justify-center gap-3">
                <div class="flex justify-between text-xs">
                  <span class="text-secondary-500">Total Tagihan</span>
                  <span class="font-bold text-secondary-800 dark:text-white">
                    {formatRupiah(tagihanStats().totalNominal)}
                  </span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-secondary-500">Telah Terbayar</span>
                  <span class="font-bold text-green-600">{formatRupiah(tagihanStats().totalTerbayar)}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-secondary-500">Sisa Tunggakan</span>
                  <span class="font-bold text-rose-600">
                    {formatRupiah(tagihanStats().totalNominal - tagihanStats().totalTerbayar)}
                  </span>
                </div>
                <div class="mt-2 text-center">
                  <a href="/keuangan" class="text-xs font-bold text-brand-600 hover:text-brand-700 underline">
                    Kelola Keuangan →
                  </a>
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* PDDIKTI Sync Status */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
          <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Sinkronisasi PDDIKTI</h3>
          <Show
            when={!pddiktiStats.loading && pddiktiStats()}
            fallback={<p class="text-xs text-secondary-400 text-center py-8">Memuat...</p>}
          >
            <div class="space-y-3">
              <For each={Object.entries(pddiktiStats() || {})}>
                {([key, val]: [string, any]) => (
                  <div class="flex items-center justify-between border-b border-secondary-100 dark:border-secondary-800 pb-2 last:border-0">
                    <span class="text-xs font-semibold text-secondary-600 dark:text-secondary-300 capitalize">
                      {key}
                    </span>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-secondary-400">{val.total} total</span>
                      <span
                        class={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          val.unsynced > 0
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                        }`}
                      >
                        {val.unsynced > 0 ? `${val.unsynced} pending` : 'Tersync'}
                      </span>
                    </div>
                  </div>
                )}
              </For>
              <div class="pt-2 text-center">
                <a href="/pddikti" class="text-xs font-bold text-brand-600 hover:text-brand-700 underline">
                  Sinkronisasi Data →
                </a>
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Periode Aktif Info */}
      <div class="bg-gradient-to-r from-brand-600 to-accent-700 text-white rounded-2xl p-5 shadow-sm">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 class="text-sm font-bold opacity-90">Periode Akademik Aktif</h3>
            <p class="text-2xl font-extrabold">{periodeAktif()?.nama || '-'}</p>
          </div>
          <a
            href="/periode-akademik"
            class="px-4 py-2 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
          >
            Kelola Periode
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Dosen Dashboard Widgets ────────────────────────────────────────
function DosenWidgets() {
  const auth = useAuth();
  const user = () => auth.user();
  const dosenEmail = () => user()?.email;

  const [dosenProfile] = createResource(dosenEmail, async (email) => {
    if (!email) return null;
    const res = await dosenController.getAll(email, 1, 1);
    return res.data[0] || null;
  });

  const [kelasDiampu] = createResource(
    () => dosenProfile()?.id,
    async (dosenId) => {
      if (!dosenId) return { data: [] };
      return await dosenPengajarController.getAll(undefined, dosenId, 1, 50);
    },
  );

  const [bimbingans] = createResource(
    async () => {
      try {
        return await bimbinganController.getMonitoring();
      } catch {
        return [];
      }
    },
    { initialValue: [] },
  );

  const dosenBimbingan = () => {
    const data = bimbingans();
    if (!dosenProfile()) return [];
    return data.filter((b: any) => b.dosenPaId === dosenProfile()?.id);
  };

  return (
    <div class="flex flex-col gap-6">
      {/* Stat Cards */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Kelas Diampu"
          value={kelasDiampu.loading ? '...' : kelasDiampu()?.meta?.total || 0}
          subtitle="Semester ini"
          icon={
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          }
          color="brand"
          href="/kelas-kuliah"
        />
        <StatCard
          title="Mahasiswa Bimbingan"
          value={dosenBimbingan().length}
          icon={
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
          color="accent"
          href="/bimbingan"
        />
        <StatCard
          title="Total SKS Mengajar"
          value={kelasDiampu()?.data?.reduce((s: number, k: any) => s + (k.sksBebanMengajar || 0), 0) || '...'}
          icon={
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
          color="green"
        />
      </div>

      {/* Daftar Kelas Diampu */}
      <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl p-5 shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm font-bold text-secondary-800 dark:text-white">Kelas Diampu Semester Ini</h3>
          <a href="/jurnal-presensi" class="text-xs font-bold text-brand-600 hover:text-brand-700 underline">
            Isi BAP & Presensi →
          </a>
        </div>
        <Show
          when={!kelasDiampu.loading}
          fallback={<p class="text-xs text-secondary-400 text-center py-6">Memuat...</p>}
        >
          <Show
            when={kelasDiampu()?.data?.length > 0}
            fallback={<p class="text-xs text-secondary-400 text-center py-6">Belum ada kelas yang diampu</p>}
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <For each={kelasDiampu()?.data}>
                {(item: any) => (
                  <a
                    href={`/jurnal-presensi?kelas=${item.kelasKuliahId}`}
                    class="border border-secondary-100 dark:border-secondary-800 rounded-xl p-4 hover:shadow-md hover:border-brand-200 transition-all bg-secondary-50/40 dark:bg-secondary-800/40"
                  >
                    <div class="text-xs font-bold text-secondary-500 dark:text-secondary-300 uppercase tracking-wider">
                      {item.kelasKuliah?.namaKelas}
                    </div>
                    <div class="text-sm font-bold text-secondary-800 dark:text-white mt-1">
                      {item.kelasKuliah?.mataKuliah?.nama || 'Mata Kuliah'}
                    </div>
                    <div class="text-[10px] text-secondary-400 mt-1 flex items-center gap-2">
                      <span>{item.kelasKuliah?.mataKuliah?.kode}</span>
                      <span>•</span>
                      <span>{item.sksBebanMengajar || item.kelasKuliah?.mataKuliah?.sksTotal} SKS</span>
                    </div>
                  </a>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>

      {/* Mahasiswa Bimbingan */}
      <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl p-5 shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm font-bold text-secondary-800 dark:text-white">
            Mahasiswa Bimbingan Akademik
            <span class="ml-2 text-[10px] font-normal text-secondary-400">({dosenBimbingan().length} mahasiswa)</span>
          </h3>
        </div>
        <Show
          when={dosenBimbingan().length > 0}
          fallback={<p class="text-xs text-secondary-400 text-center py-6">Belum ada mahasiswa bimbingan</p>}
        >
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-secondary-100 dark:border-secondary-800">
                  <th class="pb-2 font-semibold text-secondary-400">NIM</th>
                  <th class="pb-2 font-semibold text-secondary-400">Nama</th>
                  <th class="pb-2 font-semibold text-secondary-400">Status</th>
                  <th class="pb-2 font-semibold text-secondary-400">Bimbingan</th>
                  <th class="pb-2 font-semibold text-secondary-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <For each={dosenBimbingan()}>
                  {(m: any) => (
                    <tr class="border-b border-secondary-50 dark:border-secondary-800/50 hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                      <td class="py-3 font-mono text-secondary-600">{m.nim}</td>
                      <td class="py-3 font-semibold text-secondary-800 dark:text-white">{m.nama}</td>
                      <td class="py-3">
                        <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          Aktif
                        </span>
                      </td>
                      <td class="py-3 text-secondary-500">
                        {m.bimbinganId ? `${m.totalSesi || 0} sesi` : 'Belum ada'}
                      </td>
                      <td class="py-3">
                        <a
                          href={`/bimbingan?mhs=${m.id}`}
                          class="text-brand-600 hover:text-brand-700 font-bold text-[10px]"
                        >
                          Detail →
                        </a>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>
    </div>
  );
}

// ─── Mahasiswa Dashboard Widgets ────────────────────────────────────
function MahasiswaWidgets() {
  const auth = useAuth();
  const user = () => auth.user();
  const userEmail = () => user()?.email;

  const [mhsProfile] = createResource(userEmail, async (email) => {
    if (!email) return null;
    const res = await mahasiswaController.getAll(email, 1, 1);
    return res.data[0] || null;
  });

  const mhsId = () => mhsProfile()?.id;
  const nim = () => mhsProfile()?.nim;

  const [akademikSummary] = createResource(mhsId, async (id) => {
    if (!id) return null;
    try {
      return await bimbinganController.getAkademikSummary(id);
    } catch {
      return null;
    }
  });

  const [transkrip] = createResource(mhsId, async (id) => {
    if (!id) return null;
    try {
      return await khsController.getTranskrip(id);
    } catch {
      return null;
    }
  });

  const [tagihanMhs] = createResource(nim, async (n) => {
    if (!n) return { data: [] };
    const res = await tagihanController.getAll(n, undefined, 1, 10);
    return res;
  });

  const ipsData = () => {
    const t = transkrip();
    if (!t?.transkripList) return { labels: [], data: [] };
    const ipsList = t.transkripList.filter((item: any) => item.ips != null).slice(-8);
    return {
      labels: ipsList.map((item: any) => item.periodeId || `Smt ${item.semester}`),
      data: ipsList.map((item: any) => parseFloat(item.ips) || 0),
    };
  };

  const currentTagihan = () => tagihanMhs()?.data?.[0] || null;

  return (
    <div class="flex flex-col gap-6">
      {/* Row 1: Stat Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="IPK"
          value={akademikSummary.loading ? '...' : (akademikSummary()?.ipk ?? '...')}
          subtitle="Kumulatif"
          icon={
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
          color="brand"
          href="/khs"
        />
        <StatCard
          title="IP Semester Lalu"
          value={akademikSummary.loading ? '...' : (akademikSummary()?.ipsSemesterLalu ?? '...')}
          icon={
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
          color="accent"
        />
        <StatCard
          title="Total SKS"
          value={transkrip()?.summary?.totalSks ?? '...'}
          icon={
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Kompensasi"
          value={akademikSummary.loading ? '...' : `${akademikSummary()?.sisaKompensasi || 0} Menit`}
          color={(akademikSummary()?.sisaKompensasi || 0) > 0 ? 'rose' : 'green'}
          icon={
            <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      {/* Row 2: IP Trend + Tagihan */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IP Trend Chart */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
          <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Tren IP per Semester</h3>
          <Show
            when={ipsData().labels.length > 0}
            fallback={<p class="text-xs text-secondary-400 text-center py-8">Belum ada data nilai</p>}
          >
            <LineChart
              labels={ipsData().labels}
              datasets={[
                {
                  label: 'IP Semester',
                  data: ipsData().data,
                  borderColor: '#6366f1',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                },
              ]}
              height={200}
              yLabel="IP"
            />
          </Show>
        </div>

        {/* Tagihan Info */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
          <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Status Tagihan</h3>
          <Show
            when={currentTagihan()}
            fallback={
              <div class="text-center py-8">
                <p class="text-xs text-secondary-400">Tidak ada tagihan aktif</p>
                <a
                  href="/keuangan"
                  class="text-xs font-bold text-brand-600 hover:text-brand-700 underline mt-2 inline-block"
                >
                  Lihat Riwayat →
                </a>
              </div>
            }
          >
            <div class="space-y-4">
              <div class="flex items-center justify-between text-xs">
                <span class="text-secondary-500">Nominal Tagihan</span>
                <span class="font-bold text-secondary-800 dark:text-white">
                  {formatRupiah(currentTagihan()?.nominal || 0)}
                </span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-secondary-500">Terbayar</span>
                <span class="font-bold text-green-600">{formatRupiah(currentTagihan()?.nominalTerbayar || 0)}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-secondary-500">Sisa</span>
                <span class="font-bold text-rose-600">
                  {formatRupiah((currentTagihan()?.nominal || 0) - (currentTagihan()?.nominalTerbayar || 0))}
                </span>
              </div>
              <div class="bg-secondary-50 dark:bg-secondary-800 rounded-xl h-2 overflow-hidden">
                <div
                  class="h-full rounded-xl transition-all duration-500"
                  classList={{
                    'bg-green-500': currentTagihan()?.status === 'lunas',
                    'bg-yellow-500': currentTagihan()?.status === 'cicilan',
                    'bg-rose-500': currentTagihan()?.status === 'belum_bayar',
                  }}
                  style={{
                    width: `${Math.min(100, ((currentTagihan()?.nominalTerbayar || 0) / (currentTagihan()?.nominal || 1)) * 100)}%`,
                  }}
                />
              </div>
              <div class="text-center">
                <span
                  class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    currentTagihan()?.status === 'lunas'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : currentTagihan()?.status === 'cicilan'
                        ? 'bg-brand-50 text-brand-700 border border-brand-200'
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}
                >
                  {currentTagihan()?.status === 'lunas'
                    ? 'Lunas'
                    : currentTagihan()?.status === 'cicilan'
                      ? 'Cicilan'
                      : 'Belum Bayar'}
                </span>
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Poin Pelanggaran Info */}
      <div class="bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold opacity-90">Poin Pelanggaran</h3>
            <p class="text-2xl font-extrabold">{akademikSummary()?.poinPelanggaran || 0}</p>
          </div>
          <a
            href="/pelanggaran"
            class="px-4 py-2 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
          >
            Lihat Detail
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────
export default function Dashboard() {
  const auth = useAuth();
  const user = () => auth.user();
  const role = () => user()?.role;

  return (
    <MainLayout>
      <div class="flex flex-col gap-8 text-secondary-800 dark:text-white transition-colors duration-200">
        {/* Welcome Section */}
        <div class="bg-gradient-to-r from-brand-600 to-accent-700 text-white rounded-2xl p-8 shadow-lg relative overflow-hidden">
          <div class="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div class="relative z-10 flex flex-col gap-2">
            <h1 class="text-3xl font-extrabold tracking-tight">Selamat Datang, {user()?.nama || user()?.email}!</h1>
            <p class="text-brand-100 max-w-xl">
              Anda masuk sebagai <strong class="uppercase text-white">{role()}</strong> di SIMAK Vokasi Politeknik
              Sorowako.
            </p>
          </div>
        </div>

        {/* Role-based Dashboard Content */}
        <Show when={role() === 'admin'}>
          <AdminWidgets />
        </Show>
        <Show when={role() === 'dosen'}>
          <DosenWidgets />
        </Show>
        <Show when={role() === 'mahasiswa'}>
          <MahasiswaWidgets />
        </Show>

        {/* Other roles */}
        <Show when={role() === 'prodi' || role() === 'keuangan'}>
          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl p-6 shadow-sm">
            <p class="text-sm text-secondary-500">
              Dashboard khusus untuk role <strong>{role()}</strong> sedang dalam pengembangan. Silakan gunakan menu
              navigasi di sebelah kiri.
            </p>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
