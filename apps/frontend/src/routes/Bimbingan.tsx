import { createEffect, createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { StudentAvatar } from '../components/ui/StudentAvatar';
import { useAuth } from '../contexts/AuthContext';
import {
  BimbinganThread,
  bimbinganController,
  PelanggaranRekap,
  SesiBimbingan,
} from '../controllers/bimbinganController';
import { dosenController } from '../controllers/dosenController';
import { kategoriBimbinganController } from '../controllers/kategoriBimbinganController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { KompensasiDetailResponse, presensiController } from '../controllers/presensiController';
import { prodiController } from '../controllers/prodiController';
import { fmtTanggal, fmtWaktu, getTodayString } from '../utils/format';

export default function Bimbingan() {
  const auth = useAuth();
  const user = () => auth.user();

  // Selected student for Dosen/Admin view
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  const [selectedMhsNama, setSelectedMhsNama] = createSignal<string>('');

  // Search & Filter for Dosen/Admin monitoring list
  const [searchFilter, setSearchFilter] = createSignal('');
  const [angkatanFilter, setAngkatanFilter] = createSignal('');
  const [prodiFilter, setProdiFilter] = createSignal<number | null>(null);

  // Selected Academic Period (for History)
  const [selectedPeriode, setSelectedPeriode] = createSignal<string>('');

  // Messages input & category
  const [messageText, setMessageText] = createSignal('');
  const [chatType, setChatType] = createSignal<'uts' | 'uas'>('uts');

  // Local state for live chat messages
  const [messages, setMessages] = createSignal<BimbinganThread[]>([]);

  // Dosen inputs for ringkasan and approval
  const [ringkasanText, setRingkasanText] = createSignal('');
  const [isApprovedStatus, setIsApprovedStatus] = createSignal(false);

  // BKD Sesi Modal Inputs
  const [showSesiModal, setShowSesiModal] = createSignal(false);
  const [editingSesiId, setEditingSesiId] = createSignal<number | null>(null);
  const [pertemuanKeInput, setPertemuanKeInput] = createSignal(1);
  const [tanggalInput, setTanggalInput] = createSignal(getTodayString());
  const [permasalahanInput, setPermasalahanInput] = createSignal('');
  const [solusiInput, setSolusiInput] = createSignal('');
  const [statusBkdInput, setStatusBkdInput] = createSignal(true);
  const [kategoriInput, setKategoriInput] = createSignal<number | null>(null);

  // Kategori Management Signals
  const [showKategoriModal, setShowKategoriModal] = createSignal(false);
  const [newKatNama, setNewKatNama] = createSignal('');
  const [newKatDeskripsi, setNewKatDeskripsi] = createSignal('');

  // Detail Pelanggaran & Kompensasi Modal Signals
  const [showPelanggaranDetail, setShowPelanggaranDetail] = createSignal(false);
  const [showKompensasiDetail, setShowKompensasiDetail] = createSignal(false);

  // Right panel toggle state (persisted to localStorage)
  const [isRightPanelOpen, setIsRightPanelOpen] = createSignal<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('simak_bimbingan_right_panel') !== 'false' : true,
  );

  const toggleRightPanel = () => {
    const next = !isRightPanelOpen();
    setIsRightPanelOpen(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('simak_bimbingan_right_panel', String(next));
    }
  };

  // Helper formatting predikat pelanggaran TXLY
  const formatPelanggaranTxly = (poin?: number, predikat?: string) => {
    const p = poin || 0;
    if (predikat && predikat.startsWith('T') && predikat.includes('L')) {
      const match = predikat.match(/T(\d+)L(\d+)/);
      if (match) {
        const t = parseInt(match[1], 10);
        const l = parseInt(match[2], 10);
        return {
          label: `(Tertulis: ${t}, Lisan: ${l})`,
          predikat: `T${t}L${l}`,
          t,
          l,
          poin: p,
        };
      }
    }
    const t = Math.floor(p / 4);
    const l = p % 4;
    return {
      label: `(Tertulis: ${t}, Lisan: ${l})`,
      predikat: `T${t}L${l}`,
      t,
      l,
      poin: p,
    };
  };

  // Fetch Program Studi & Kategori List
  const [prodisList] = createResource(() => prodiController.getAll(undefined, 1, 100));
  const [kategoriList, { refetch: refetchKategori }] = createResource(() => kategoriBimbinganController.getAll());

  // Load Akademik Summary Resource
  const [akademikSummary, { refetch: refetchAkademik }] = createResource(
    () => (auth.hasRole(['mahasiswa']) ? mhsProfile()?.id : selectedMhsId()),
    async (id) => {
      if (!id) return null;
      return await bimbinganController.getAkademikSummary(id);
    },
  );

  const sisaKompensasiMhs = () => {
    const raw = akademikSummary()?.sisaKompensasi || 0;
    return auth.hasRole(['mahasiswa']) ? Math.max(0, raw) : raw;
  };

  // Lazy-fetch detail pelanggaran & kompensasi hanya saat modal dibuka.
  const detailTargetMhsId = () => {
    if (auth.hasRole(['mahasiswa'])) return mhsProfile()?.id ?? null;
    return selectedMhsId();
  };

  const [pelanggaranDetail] = createResource(
    () => (showPelanggaranDetail() ? detailTargetMhsId() : null),
    async (id) => {
      if (!id) return null;
      return await bimbinganController.getPelanggaranByMhsId(id);
    },
  );

  const [kompensasiDetail] = createResource(
    () => (showKompensasiDetail() ? detailTargetMhsId() : null),
    async (id) => {
      if (!id) return null;
      return await presensiController.getKompensasiDetail(id);
    },
  );

  // Load profiles
  const [mhsProfile] = createResource(
    () => {
      if (auth.hasRole(['mahasiswa'])) return user()?.email;
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await mahasiswaController.getAll(email, 1, 1);
      return res.data[0] || null;
    },
  );

  const [dosenProfile] = createResource(
    () => {
      if (auth.hasRole(['dosen'])) return user()?.email;
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await dosenController.getAll(email, 1, 1);
      return res.data[0] || null;
    },
  );

  // Kategori Filter Signal (PA, TUGAS_AKHIR, MAGANG)
  const [kategoriFilter, setKategoriFilter] = createSignal<string>('ALL');

  // Load student's own bimbingan (active or selected period)
  const [studentBimbingan, { refetch: refetchStudentBimb }] = createResource(
    () => ({ id: mhsProfile()?.id, period: selectedPeriode(), kat: kategoriFilter() }),
    async ({ id, period, kat }) => {
      if (!id) return null;
      const res = await bimbinganController.getByMhsId(id, period || undefined, kat !== 'ALL' ? kat : undefined);
      if (res && res.isReadByMahasiswa === false) {
        bimbinganController.markAsRead(id).catch(() => {});
      }
      return res;
    },
  );

  // Load Dosen/Admin monitoring data
  const [monitoringList, { refetch: refetchMonitoring }] = createResource(
    () => ({ role: auth.hasRole(['admin', 'dosen']), kat: kategoriFilter() }),
    async ({ role, kat }) => {
      if (!role) return null;
      return await bimbinganController.getMonitoring(kat !== 'ALL' ? kat : undefined);
    },
  );

  // Filtered monitoring list for Dosen/Admin with search, angkatan, and prodi filter
  const filteredMonitoring = () => {
    let list = monitoringList() || [];
    if (auth.hasRole(['dosen'])) {
      const dId = dosenProfile()?.id;
      if (!dId) return [];
      list = list.filter((item) => item.dosenPaId === dId);
    }
    if (searchFilter().trim()) {
      const q = searchFilter().toLowerCase();
      list = list.filter((item) => item.nama.toLowerCase().includes(q) || item.nim.toLowerCase().includes(q));
    }
    if (angkatanFilter()) {
      list = list.filter((item) => item.angkatan === angkatanFilter());
    }
    if (prodiFilter()) {
      list = list.filter((item) => item.prodiId === prodiFilter());
    }
    return list;
  };

  // Selected student bimbingan details
  const [selectedBimbingan, { refetch: refetchSelectedBimb }] = createResource(
    () => ({ id: selectedMhsId(), period: selectedPeriode() }),
    async ({ id, period }) => {
      if (!id) return null;
      const bimb = await bimbinganController.getByMhsId(id, period || undefined);
      setRingkasanText(bimb.ringkasan || '');
      setIsApprovedStatus(bimb.isApproved);
      return bimb;
    },
  );

  // Sync messages from resource to local signal
  createEffect(() => {
    const activeBimb = auth.hasRole(['mahasiswa']) ? studentBimbingan() : selectedBimbingan();
    if (activeBimb) {
      if (activeBimb.thread) {
        setMessages(activeBimb.thread);
      } else {
        setMessages([]);
      }
      setRingkasanText(activeBimb.ringkasan || '');
      setIsApprovedStatus(activeBimb.isApproved);
    } else {
      setMessages([]);
      setRingkasanText('');
      setIsApprovedStatus(false);
    }
  });

  // Real-time WebSocket connection
  let ws: WebSocket | null = null;
  createEffect(() => {
    const activeBimb = auth.hasRole(['mahasiswa']) ? studentBimbingan() : selectedBimbingan();
    if (ws) {
      ws.close();
      ws = null;
    }
    if (activeBimb && activeBimb.id) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const jwtToken = auth.token() || '';
      // Connect to Elysia WebSocket with token auth
      ws = new WebSocket(
        `${protocol}//${host}/api/bimbingan/ws/${activeBimb.id}?token=${encodeURIComponent(jwtToken)}`,
      );
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' && data.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [data.message, ...prev];
            });
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };
    }
  });

  onCleanup(() => {
    if (ws) ws.close();
  });

  // Calculate UTS / UAS counts
  const utsCount = () => messages().filter((m) => m.tipe === 'uts').length;
  const uasCount = () => messages().filter((m) => m.tipe === 'uas').length;

  const currentBimbinganData = () => {
    return auth.hasRole(['mahasiswa']) ? studentBimbingan() : selectedBimbingan();
  };

  const handleSendMessage = async (e: Event) => {
    e.preventDefault();
    const text = messageText().trim();
    if (!text) return;

    const targetId = auth.hasRole(['mahasiswa']) ? mhsProfile()?.id : selectedMhsId();
    if (!targetId) return;

    try {
      const newMsg = await bimbinganController.sendThread(targetId, text, chatType());
      setMessageText('');
      // Optimistic/immediate local update
      setMessages((prev) => [newMsg, ...prev]);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal mengirim pesan.');
    }
  };

  const handleUpdateBimbingan = async (e: Event) => {
    e.preventDefault();
    const targetId = selectedMhsId();
    if (!targetId) return;

    try {
      await bimbinganController.updateBimbingan(targetId, {
        ringkasan: ringkasanText(),
        isApproved: isApprovedStatus(),
      });
      alert('Kelayakan ujian & ringkasan bimbingan berhasil diperbarui.');
      refetchSelectedBimb();
      refetchMonitoring();
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal memperbarui bimbingan.');
    }
  };

  const handleClearChat = async () => {
    const targetId = auth.hasRole(['mahasiswa']) ? mhsProfile()?.id : selectedMhsId();
    if (!targetId) return;
    if (!confirm('Apakah Anda yakin ingin mengosongkan seluruh pesan obrolan di thread ini?')) return;

    try {
      await bimbinganController.clearChatThread(targetId);
      setMessages([]);
      alert('Pesan obrolan berhasil dikosongkan.');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal mengosongkan obrolan.');
    }
  };

  const handleOpenAddSesi = () => {
    setEditingSesiId(null);
    const activeBimb = selectedBimbingan();
    const currentCount = activeBimb?.sesi?.length || 0;
    setPertemuanKeInput(currentCount + 1);
    setTanggalInput(getTodayString());
    setPermasalahanInput('');
    setSolusiInput('');
    setStatusBkdInput(true);
    setKategoriInput(null);
    setShowSesiModal(true);
  };

  const handleOpenEditSesi = (sesi: SesiBimbingan) => {
    setEditingSesiId(sesi.id);
    setPertemuanKeInput(sesi.pertemuanKe);
    setTanggalInput(sesi.tanggalBimbingan);
    setPermasalahanInput(sesi.permasalahan ?? '');
    setSolusiInput(sesi.solusi);
    setStatusBkdInput(sesi.statusBkd);
    setKategoriInput(sesi.kategoriId || null);
    setShowSesiModal(true);
  };

  const handleSaveSesi = async (e: Event) => {
    e.preventDefault();
    const targetMhsId = selectedMhsId();
    if (!targetMhsId) return;

    try {
      const payload = {
        pertemuanKe: pertemuanKeInput(),
        tanggalBimbingan: tanggalInput(),
        permasalahan: permasalahanInput(),
        solusi: solusiInput(),
        statusBkd: statusBkdInput(),
        kategoriId: kategoriInput() || null,
      };

      if (editingSesiId()) {
        await bimbinganController.updateSesi(editingSesiId()!, payload);
      } else {
        await bimbinganController.addSesi(targetMhsId, payload);
      }

      setShowSesiModal(false);
      refetchSelectedBimb();
      refetchMonitoring();
      refetchAkademik();
      alert('Sesi bimbingan berhasil disimpan.');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menyimpan sesi bimbingan.');
    }
  };

  const handleDeleteSesi = async (sesiId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus sesi bimbingan ini?')) return;
    try {
      await bimbinganController.deleteSesi(sesiId);
      refetchSelectedBimb();
      refetchMonitoring();
      refetchAkademik();
      alert('Sesi bimbingan berhasil dihapus.');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menghapus sesi bimbingan.');
    }
  };

  const handleAddKategori = async (e: Event) => {
    e.preventDefault();
    if (!newKatNama().trim()) return;
    try {
      await kategoriBimbinganController.create({
        nama: newKatNama().trim(),
        deskripsi: newKatDeskripsi().trim(),
      });
      setNewKatNama('');
      setNewKatDeskripsi('');
      refetchKategori();
      alert('Kategori bimbingan baru berhasil ditambahkan!');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menambahkan kategori bimbingan.');
    }
  };

  const handleDeleteKategori = async (katId: number) => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan kategori bimbingan ini?')) return;
    try {
      await kategoriBimbinganController.delete(katId);
      refetchKategori();
      alert('Kategori bimbingan berhasil dinonaktifkan.');
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menghapus kategori bimbingan.');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm print:hidden dark:bg-secondary-900 dark:border-secondary-800">
          <div>
            <h1 class="page-title">Bimbingan Akademik</h1>
            <p class="text-base text-secondary-500 dark:text-secondary-300">
              Modul bimbingan wali & persetujuan prasyarat UTS/UAS
            </p>
          </div>

          {/* Status Kelayakan (Mahasiswa) & Dropdown Periode */}
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Show when={auth.hasRole(['admin', 'super_admin', 'prodi', 'dosen'])}>
              <button
                onClick={() => setShowKategoriModal(true)}
                class="px-3 py-1.5 border border-secondary-200 text-secondary-700 font-bold rounded-lg text-caption hover:bg-secondary-50 transition-colors flex items-center gap-1.5 dark:border-secondary-700 dark:text-white dark:hover:bg-secondary-800"
              >
                ⚙️ Kelola Kategori
              </button>
              <button
                onClick={() => window.open('/laporan/bkd', '_blank')}
                class="px-3 py-1.5 bg-brand-600 text-white font-bold rounded-lg text-caption hover:bg-brand-700 transition-colors flex items-center gap-1.5 dark:bg-brand-700 dark:hover:bg-brand-600"
              >
                🖨️ Cetak Laporan BKD
              </button>
            </Show>

            <Show when={currentBimbinganData()?.availablePeriodes}>
              <div class="flex items-center gap-2">
                <span class="text-caption text-secondary-400 dark:text-secondary-300 font-semibold uppercase">
                  Periode:
                </span>
                <select
                  class="border border-secondary-200 rounded-lg px-2.5 py-1 text-caption bg-white focus:outline-none text-secondary-900 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                  value={selectedPeriode() || currentBimbinganData()?.periodeId}
                  onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
                >
                  <For each={currentBimbinganData()?.availablePeriodes}>{(p) => <option value={p}>{p}</option>}</For>
                </select>
              </div>
            </Show>

            <Show when={auth.hasRole(['mahasiswa']) && studentBimbingan()}>
              <div class="flex items-center gap-3">
                <span class="text-base text-secondary-400 dark:text-secondary-300 font-medium">Ujian:</span>
                <Show
                  when={studentBimbingan()?.isApproved}
                  fallback={
                    <span class="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-caption font-bold border border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                      Bimbingan Kurang
                    </span>
                  }
                >
                  <span class="px-3 py-1.5 bg-accent-50 text-accent-600 rounded-full text-caption font-bold border border-accent-100 dark:bg-accent-900/30 dark:text-accent-400 dark:border-accent-800">
                    Layak Ujian
                  </span>
                </Show>
              </div>
            </Show>
          </div>
        </div>

        {/* --- MAHASISWA VIEW --- */}
        <Show when={auth.hasRole(['mahasiswa'])}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            {/* Chat Thread Panel */}
            <div class="lg:col-span-2 bg-white rounded-2xl border border-secondary-100 shadow-sm flex flex-col h-[600px] overflow-hidden dark:bg-secondary-900 dark:border-secondary-800">
              <div class="p-4 border-b border-secondary-50 bg-secondary-50/50 flex items-center justify-between dark:bg-secondary-800">
                <h3 class="font-bold text-secondary-800 dark:text-white">Konsultasi Dosen PA</h3>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 bg-brand-50 text-brand-700 text-fine font-bold rounded dark:bg-brand-900/30 dark:text-white">
                    UTS: {utsCount()}/1
                  </span>
                  <span class="px-2 py-0.5 bg-accent-50 text-accent-700 text-fine font-bold rounded dark:bg-accent-900/30 dark:text-accent-400">
                    UAS: {uasCount()}/3
                  </span>
                </div>
              </div>

              {/* Message List */}
              <div class="flex-1 p-6 overflow-y-auto flex flex-col-reverse gap-4 bg-secondary-50/30 dark:bg-secondary-800">
                <Show
                  when={messages().length > 0}
                  fallback={
                    <div class="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <span class="text-4xl mb-2">💬</span>
                      <p class="text-secondary-400 dark:text-secondary-300 text-base">
                        Belum ada percakapan. Mulai bimbingan dengan mengirim pesan di bawah.
                      </p>
                    </div>
                  }
                >
                  <For each={messages()}>
                    {(msg) => (
                      <div
                        class={`flex flex-col max-w-[80%] ${msg.senderRole === 'mahasiswa' ? 'self-end items-end' : 'self-start items-start'}`}
                      >
                        <div
                          class={`p-3 rounded-2xl text-base ${msg.senderRole === 'mahasiswa' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white text-secondary-800 border border-secondary-100 rounded-tl-none shadow-sm'}`}
                        >
                          {msg.pesan}
                        </div>
                        <span class="text-fine text-secondary-400 dark:text-secondary-300 mt-1 uppercase tracking-wider font-medium">
                          {msg.senderRole} • {msg.tipe.toUpperCase()} •{' '}
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </For>
                </Show>
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleSendMessage}
                class="p-4 border-t border-secondary-100 bg-white flex flex-col gap-3 dark:border-secondary-800 dark:bg-secondary-900"
              >
                <div class="flex items-center gap-4 text-caption font-semibold text-secondary-500 dark:text-secondary-300">
                  <span>Tipe Bimbingan:</span>
                  <label class="flex items-center gap-1.5 cursor-pointer text-secondary-900 dark:text-white">
                    <input
                      type="radio"
                      name="chatType"
                      checked={chatType() === 'uts'}
                      onChange={() => setChatType('uts')}
                    />
                    Persiapan UTS
                  </label>
                  <label class="flex items-center gap-1.5 cursor-pointer text-secondary-900 dark:text-white">
                    <input
                      type="radio"
                      name="chatType"
                      checked={chatType() === 'uas'}
                      onChange={() => setChatType('uas')}
                    />
                    Persiapan UAS
                  </label>
                </div>

                <div class="flex gap-3">
                  <input
                    type="text"
                    placeholder="Tulis pesan bimbingan..."
                    value={messageText()}
                    onInput={(e) => setMessageText(e.currentTarget.value)}
                    class="flex-1 border border-secondary-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                  <button
                    type="submit"
                    class="px-5 py-3 bg-brand-600 text-white font-bold rounded-xl text-base hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-accent-200 dark:bg-brand-700 dark:hover:bg-brand-600"
                  >
                    Kirim
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar Ringkasan */}
            <div class="flex flex-col gap-6">
              <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
                <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">Catatan Dosen PA</h3>

                <Show when={studentBimbingan()?.ringkasan}>
                  <div class="flex flex-col gap-1">
                    <span class="text-fine font-bold text-secondary-400 dark:text-secondary-300 uppercase tracking-wider">
                      Catatan Kelayakan / Ringkasan
                    </span>
                    <div class="p-3 bg-brand-50/50 border border-brand-100/50 rounded-xl text-caption text-brand-900 leading-relaxed">
                      {studentBimbingan()?.ringkasan}
                    </div>
                  </div>
                </Show>

                <div class="flex flex-col gap-3">
                  <span class="text-fine font-bold text-secondary-400 dark:text-secondary-300 uppercase tracking-wider block">
                    Riwayat Sesi Pertemuan
                  </span>
                  <Show
                    when={studentBimbingan()?.sesi && studentBimbingan()!.sesi.length > 0}
                    fallback={
                      <p class="text-caption text-secondary-400 dark:text-secondary-300 italic">
                        Belum ada sesi bimbingan yang tercatat.
                      </p>
                    }
                  >
                    <For each={studentBimbingan()?.sesi}>
                      {(sesi) => (
                        <div class="p-3 bg-secondary-50 border border-secondary-100 rounded-xl flex flex-col gap-2 dark:bg-secondary-800">
                          <div class="flex items-center justify-between border-b pb-1">
                            <span class="font-bold text-caption text-secondary-700">
                              Pertemuan Ke-{sesi.pertemuanKe}
                            </span>
                            <span class="text-fine text-secondary-400 dark:text-secondary-300 font-mono">
                              {new Date(sesi.tanggalBimbingan).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                            </span>
                          </div>
                          <div class="flex flex-col gap-1">
                            <span class="text-fine font-bold text-rose-500 uppercase">Permasalahan:</span>
                            <p class="text-caption text-secondary-800 whitespace-pre-wrap leading-relaxed dark:text-white">
                              {sesi.permasalahan}
                            </p>
                          </div>
                          <div class="flex flex-col gap-1">
                            <span class="text-fine font-bold text-accent-600 uppercase">Solusi / Masukan:</span>
                            <p class="text-caption text-secondary-800 whitespace-pre-wrap leading-relaxed dark:text-white">
                              {sesi.solusi}
                            </p>
                          </div>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* --- DOSEN & ADMIN VIEW --- */}
        <Show when={auth.hasRole(['dosen', 'admin'])}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            {/* List Mahasiswa */}
            <div class="bg-white rounded-2xl border border-secondary-100 shadow-sm overflow-hidden h-[600px] flex flex-col dark:bg-secondary-900 dark:border-secondary-800">
              <div class="p-3 border-b border-secondary-50 bg-secondary-50/50 flex flex-col gap-2 dark:bg-secondary-800 dark:border-secondary-700">
                <div class="flex items-center justify-between">
                  <h3 class="font-bold text-secondary-800 text-base dark:text-white">
                    {auth.hasRole(['dosen']) ? 'Mahasiswa Bimbingan' : 'Seluruh Bimbingan'}
                  </h3>
                  <span class="text-fine font-bold text-secondary-400 dark:text-secondary-300">
                    {filteredMonitoring().length} Mahasiswa
                  </span>
                </div>
                {/* Search & Filters */}
                <input
                  type="text"
                  placeholder="Cari Nama / NIM..."
                  value={searchFilter()}
                  onInput={(e) => setSearchFilter(e.currentTarget.value)}
                  class="border border-secondary-200 rounded-lg px-2.5 py-1.5 text-caption focus:outline-none focus:border-brand-500 text-secondary-900 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                />
                <div class="grid grid-cols-3 gap-1.5">
                  <select
                    value={kategoriFilter()}
                    onChange={(e) => setKategoriFilter(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-lg px-2 py-1 text-fine focus:outline-none focus:border-brand-500 text-secondary-800 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                  >
                    <option value="ALL">Semua Kategori</option>
                    <option value="PA">Akademik (PA)</option>
                    <option value="TUGAS_AKHIR">Tugas Akhir</option>
                    <option value="MAGANG">Magang</option>
                  </select>
                  <select
                    value={angkatanFilter()}
                    onChange={(e) => setAngkatanFilter(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-lg px-2 py-1 text-fine focus:outline-none focus:border-brand-500 text-secondary-800 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                  >
                    <option value="">Semua Angkatan</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                    <option value="2020">2020</option>
                  </select>
                  <select
                    value={prodiFilter() || ''}
                    onChange={(e) => setProdiFilter(e.currentTarget.value ? Number(e.currentTarget.value) : null)}
                    class="border border-secondary-200 rounded-lg px-2 py-1 text-fine focus:outline-none focus:border-brand-500 text-secondary-800 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                  >
                    <option value="">Semua Prodi</option>
                    <For each={prodisList()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
                  </select>
                </div>
              </div>
              <div class="flex-1 overflow-y-auto">
                <Show
                  when={filteredMonitoring().length > 0}
                  fallback={
                    <div class="p-8 text-center text-secondary-400 dark:text-secondary-300 text-base">
                      Tidak ada mahasiswa terdaftar.
                    </div>
                  }
                >
                  <div class="divide-y divide-secondary-50">
                    <For each={filteredMonitoring()}>
                      {(item) => (
                        <button
                          onClick={() => {
                            setSelectedMhsId(item.id);
                            setSelectedMhsNama(item.nama);
                          }}
                          class={`w-full p-4 text-left flex flex-col gap-1 transition-all hover:bg-brand-50/30 ${selectedMhsId() === item.id ? 'bg-brand-50/60 border-l-4 border-brand-600' : ''}`}
                        >
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 min-w-0">
                              <StudentAvatar foto={item.foto} nama={item.nama} nim={item.nim} size="sm" />
                              <span class="font-bold text-secondary-800 text-base dark:text-white truncate">
                                {item.nama}
                              </span>
                            </div>
                            <div class="flex items-center gap-1.5">
                              <span class="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-fine font-bold dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                                {item.totalSesi || 0}x Bimbingan (Semester Ini)
                              </span>
                              <Show
                                when={item.isApproved}
                                fallback={
                                  <span class="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-fine font-bold dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                                    Belum
                                  </span>
                                }
                              >
                                <span class="px-2 py-0.5 bg-accent-50 text-accent-600 border border-accent-100 rounded text-fine font-bold dark:bg-accent-900/30 dark:text-accent-400 dark:border-accent-800">
                                  Layak
                                </span>
                              </Show>
                            </div>
                          </div>
                          <div class="flex items-center justify-between text-caption text-secondary-400 dark:text-secondary-300">
                            <span>NIM: {item.nim}</span>
                            <Show when={item.isReadByMahasiswa !== undefined}>
                              <span
                                class={`text-fine font-semibold ${item.isReadByMahasiswa ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
                              >
                                {item.isReadByMahasiswa
                                  ? `✓ Dibaca ${item.readAtMahasiswa ? new Date(item.readAtMahasiswa).toLocaleDateString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : ''}`
                                  : '• Belum Dibaca Mahasiswa'}
                              </span>
                            </Show>
                          </div>
                          <Show when={auth.hasRole(['admin'])}>
                            <span class="text-fine text-secondary-400 dark:text-secondary-300 italic">
                              PA: {item.dosenPaNama || 'Belum diplot'}
                            </span>
                          </Show>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>

            {/* Chat & Approval Panel */}
            <div class="lg:col-span-2 flex flex-col gap-6">
              <Show
                when={selectedMhsId()}
                fallback={
                  <div class="bg-white rounded-2xl border border-secondary-100 shadow-sm flex flex-col items-center justify-center text-center p-12 h-[600px] dark:bg-secondary-900 dark:border-secondary-800">
                    <span class="text-5xl mb-4">👈</span>
                    <h3 class="font-bold text-secondary-800 text-lg dark:text-white">Pilih Mahasiswa</h3>
                    <p class="text-secondary-400 dark:text-secondary-300 text-base max-w-xs mt-1">
                      Pilih salah satu mahasiswa dari daftar di sebelah kiri untuk melihat percakapan bimbingan &
                      memberikan kelayakan ujian.
                    </p>
                  </div>
                }
              >
                <div
                  class={`grid gap-6 h-[600px] transition-all duration-300 ${
                    isRightPanelOpen() ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  {/* Panel Riwayat & Pengelolaan Sesi Bimbingan */}
                  <div class="bg-white rounded-2xl border border-secondary-100 shadow-sm flex flex-col h-full overflow-hidden dark:bg-secondary-900 dark:border-secondary-800">
                    <div class="p-4 border-b border-secondary-50 bg-secondary-50/50 flex items-center justify-between dark:bg-secondary-800 dark:border-secondary-700">
                      <div class="flex flex-col">
                        <h3 class="font-bold text-secondary-800 text-base dark:text-white">
                          📋 Sesi Bimbingan: {selectedMhsNama()}
                        </h3>
                        <span class="text-fine text-secondary-400 dark:text-secondary-300">
                          Riwayat asistensi, tugas akhir, skripsi & konsultasi akademik
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleOpenAddSesi}
                          class="px-3 py-1.5 bg-brand-600 text-white font-bold rounded-xl text-caption hover:bg-brand-700 active:scale-95 transition-all shadow-sm dark:bg-brand-700 dark:hover:bg-brand-600"
                        >
                          + Tambah Sesi
                        </button>
                        <button
                          type="button"
                          onClick={toggleRightPanel}
                          class={`px-2.5 py-1.5 border rounded-xl text-caption transition-all flex items-center gap-1.5 font-bold active:scale-95 ${
                            isRightPanelOpen()
                              ? 'bg-white border-secondary-200 text-secondary-700 hover:bg-secondary-50 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-200 dark:hover:bg-secondary-800'
                              : 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/40 dark:border-brand-800 dark:text-brand-300'
                          }`}
                          title={isRightPanelOpen() ? 'Sembunyikan Panel Resume' : 'Tampilkan Panel Resume'}
                        >
                          <svg
                            class={`w-3.5 h-3.5 transition-transform duration-200 ${isRightPanelOpen() ? '' : 'rotate-180'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                          </svg>
                          <span class="text-fine">{isRightPanelOpen() ? 'Tutup Resume' : 'Buka Resume'}</span>
                        </button>
                      </div>
                    </div>

                    <div class="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-secondary-50/30 dark:bg-secondary-800/50">
                      <Show
                        when={selectedBimbingan()?.sesi && selectedBimbingan()!.sesi.length > 0}
                        fallback={
                          <div class="flex-1 flex flex-col items-center justify-center text-center p-6">
                            <span class="text-4xl mb-2">📝</span>
                            <h4 class="font-bold text-secondary-700 text-base dark:text-white">
                              Belum Ada Sesi Bimbingan
                            </h4>
                            <p class="text-secondary-400 dark:text-secondary-300 text-caption mt-1 max-w-xs">
                              Klik tombol "+ Tambah Sesi" di atas untuk mencatat sesi asistensi/bimbingan mahasiswa.
                            </p>
                          </div>
                        }
                      >
                        <For each={selectedBimbingan()?.sesi}>
                          {(sesi: SesiBimbingan) => {
                            const katObj = (kategoriList()?.data || []).find((k) => k.id === sesi.kategoriId);
                            return (
                              <div class="p-4 bg-white border border-secondary-100 rounded-2xl shadow-sm flex flex-col gap-2 relative dark:bg-secondary-900 dark:border-secondary-800">
                                <div class="flex items-center justify-between border-b border-secondary-100 pb-2 dark:border-secondary-800">
                                  <div class="flex items-center gap-2">
                                    <span class="font-bold text-caption text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg dark:bg-brand-900/30 dark:text-brand-300">
                                      Pertemuan Ke-{sesi.pertemuanKe}
                                    </span>
                                    <Show when={katObj}>
                                      {(kat) => (
                                        <span class="px-2 py-0.5 bg-accent-50 text-accent-700 border border-accent-100 rounded-lg text-fine font-bold dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-800">
                                          {kat().nama}
                                        </span>
                                      )}
                                    </Show>
                                  </div>
                                  <div class="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditSesi(sesi)}
                                      class="text-caption text-brand-600 hover:text-brand-800 font-bold dark:text-brand-400"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSesi(sesi.id)}
                                      class="text-caption text-rose-500 hover:text-rose-700 font-bold"
                                    >
                                      🗑️ Hapus
                                    </button>
                                  </div>
                                </div>

                                <div class="flex items-center justify-between text-fine text-secondary-400 dark:text-secondary-300">
                                  <span>
                                    📅{' '}
                                    {new Date(sesi.tanggalBimbingan).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                                  </span>
                                  <span
                                    class={`font-bold px-2 py-0.5 rounded text-fine ${sesi.statusBkd ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300' : 'bg-secondary-100 text-secondary-500'}`}
                                  >
                                    BKD: {sesi.statusBkd ? 'YA' : 'TIDAK'}
                                  </span>
                                </div>

                                <div class="flex flex-col gap-1.5 mt-1 text-caption">
                                  <div class="p-2.5 bg-rose-50/50 border border-rose-100/60 rounded-xl dark:bg-rose-950/20 dark:border-rose-900/40">
                                    <span class="text-fine font-bold text-rose-600 uppercase tracking-wider block mb-0.5">
                                      Permasalahan / Topik:
                                    </span>
                                    <p class="text-secondary-800 whitespace-pre-wrap dark:text-secondary-200">
                                      {sesi.permasalahan}
                                    </p>
                                  </div>
                                  <div class="p-2.5 bg-accent-50/50 border border-accent-100/60 rounded-xl dark:bg-accent-950/20 dark:border-accent-900/40">
                                    <span class="text-fine font-bold text-accent-600 uppercase tracking-wider block mb-0.5">
                                      Solusi & Catatan Dosen PA:
                                    </span>
                                    <p class="text-secondary-800 whitespace-pre-wrap dark:text-secondary-200">
                                      {sesi.solusi}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          }}
                        </For>
                      </Show>
                    </div>
                  </div>

                  {/* Form Approval, Resume Akademik, & Timeline Sesi */}
                  <Show when={isRightPanelOpen()}>
                    <div class="bg-white rounded-2xl border border-secondary-100 shadow-sm p-6 flex flex-col gap-6 h-full overflow-y-auto dark:bg-secondary-900 dark:border-secondary-800 animate-fadeIn">
                      {/* Resume Akademik */}
                      <div class="flex flex-col gap-3">
                        <div class="flex items-center justify-between border-b pb-2">
                          <h3 class="font-bold text-secondary-800 text-base dark:text-white">📊 Resume Akademik</h3>
                          <button
                            type="button"
                            onClick={toggleRightPanel}
                            class="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 text-caption px-2 py-0.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-all font-semibold"
                            title="Sembunyikan Panel"
                          >
                            Tutup ✕
                          </button>
                        </div>
                        <div class="grid grid-cols-2 gap-3 text-caption">
                          {/* Card Pelanggaran dengan Format TXLY BPA */}
                          <div class="p-3 bg-rose-50/90 border border-rose-100 rounded-xl flex flex-col gap-0.5 dark:bg-rose-950/20 dark:border-rose-900/40">
                            <div class="flex items-center justify-between">
                              <span class="text-fine text-rose-600 font-bold uppercase tracking-wider">
                                Pelanggaran
                              </span>
                              <span class="text-fine font-bold px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded border border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800">
                                {
                                  formatPelanggaranTxly(
                                    akademikSummary()?.poinPelanggaran,
                                    akademikSummary()?.pelanggaranPredikat,
                                  ).predikat
                                }
                              </span>
                            </div>
                            <span class="text-base font-bold text-rose-700 dark:text-rose-400">
                              {
                                formatPelanggaranTxly(
                                  akademikSummary()?.poinPelanggaran,
                                  akademikSummary()?.pelanggaranPredikat,
                                ).label
                              }
                            </span>
                            <span class="text-fine text-rose-500 font-medium dark:text-rose-400/80">
                              {akademikSummary()?.poinPelanggaran || 0} Poin (-
                              {(
                                akademikSummary()?.degradasiNilaiSikap ??
                                formatPelanggaranTxly(akademikSummary()?.poinPelanggaran).t * 1.0 +
                                  formatPelanggaranTxly(akademikSummary()?.poinPelanggaran).l * 0.25
                              ).toFixed(2)}{' '}
                              Mutu)
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowPelanggaranDetail(true)}
                              class="mt-1 self-start px-2 py-1 rounded-lg text-fine font-bold text-rose-600 bg-rose-100 hover:bg-rose-200 active:scale-95 transition-all dark:text-rose-300 dark:bg-rose-900/50 dark:hover:bg-rose-900"
                            >
                              Lihat Detail →
                            </button>
                          </div>
                          <div class="p-3 bg-orange-50 border border-orange-100 rounded-xl flex flex-col gap-0.5 dark:border-orange-800">
                            <span class="text-fine text-orange-600 font-bold uppercase">Jam Kompensasi</span>
                            <span class="text-base font-bold text-orange-700">{sisaKompensasiMhs()} Menit</span>
                            <button
                              type="button"
                              onClick={() => setShowKompensasiDetail(true)}
                              class="mt-1 self-start px-2 py-1 rounded-lg text-fine font-bold text-orange-600 bg-orange-100 hover:bg-orange-200 active:scale-95 transition-all dark:text-orange-300 dark:bg-orange-800/60 dark:hover:bg-orange-800"
                            >
                              Lihat Detail →
                            </button>
                          </div>
                          <div class="p-3 bg-accent-50 border border-accent-100 rounded-xl flex flex-col gap-0.5 dark:border-accent-800">
                            <span class="text-fine text-accent-600 font-bold uppercase">IPK Kumulatif</span>
                            <span class="text-base font-bold text-accent-700">{akademikSummary()?.ipk || '0.00'}</span>
                          </div>
                          <div class="p-3 bg-brand-50 border border-brand-100 rounded-xl flex flex-col gap-0.5 dark:border-brand-800">
                            <span class="text-fine text-brand-600 font-bold uppercase">IPS Sem. Lalu</span>
                            <span class="text-base font-bold text-brand-700">
                              {akademikSummary()?.ipsSemesterLalu || '0.00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ringkasan & Approval */}
                      <form
                        onSubmit={handleUpdateBimbingan}
                        class="flex flex-col gap-4 border-t pt-4 dark:border-secondary-800"
                      >
                        <h3 class="font-bold text-secondary-800 text-base dark:text-white">
                          🔑 Status Kelayakan & Ringkasan
                        </h3>

                        <div class="flex items-center justify-between p-3 bg-secondary-50 rounded-xl border border-secondary-100 dark:bg-secondary-800 dark:border-secondary-800">
                          <div class="flex flex-col">
                            <span class="text-caption font-bold text-secondary-700 dark:text-secondary-300">
                              Setujui Kelayakan Ujian
                            </span>
                            <span class="text-fine text-secondary-400 dark:text-secondary-300">
                              Persetujuan kelayakan UTS & UAS
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isApprovedStatus()}
                            onChange={(e) => setIsApprovedStatus(e.currentTarget.checked)}
                            class="w-4 h-4 text-brand-600 border-secondary-300 rounded focus:ring-brand-500 dark:border-secondary-700"
                          />
                        </div>

                        <div class="flex flex-col gap-1.5">
                          <label class="text-caption font-bold text-secondary-700 dark:text-secondary-300">
                            Ringkasan Bimbingan / Masukan Global
                          </label>
                          <textarea
                            rows="2"
                            placeholder="Ringkasan bimbingan untuk satu semester..."
                            value={ringkasanText()}
                            onInput={(e) => setRingkasanText(e.currentTarget.value)}
                            class="border border-secondary-200 rounded-xl p-3 text-caption focus:outline-none focus:border-brand-500 text-secondary-950 resize-none dark:border-secondary-700 dark:bg-secondary-800 dark:text-white"
                          />
                        </div>

                        <button
                          type="submit"
                          class="w-full py-2.5 bg-brand-600 text-white font-bold rounded-xl text-caption hover:bg-brand-700 transition-all shadow-sm dark:bg-brand-700 dark:hover:bg-brand-600"
                        >
                          Update Kelayakan & Ringkasan
                        </button>
                      </form>
                    </div>
                  </Show>
                </div>

                {/* --- MODAL TAMBAH / EDIT SESI BIMBINGAN --- */}
                <Show when={showSesiModal()}>
                  <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 dark:bg-secondary-900">
                      <h3 class="font-bold text-secondary-800 text-base dark:text-white">
                        {editingSesiId() ? 'Edit Sesi Bimbingan' : 'Tambah Sesi Bimbingan'}
                      </h3>

                      <form onSubmit={handleSaveSesi} class="flex flex-col gap-4">
                        <div class="flex flex-col gap-1">
                          <label class="text-caption font-bold text-secondary-600">Pertemuan Ke</label>
                          <input
                            type="number"
                            min="1"
                            value={pertemuanKeInput()}
                            onInput={(e) => setPertemuanKeInput(parseInt(e.currentTarget.value) || 1)}
                            class="border border-secondary-200 rounded-xl px-3 py-2 text-caption focus:outline-none focus:border-brand-500 text-secondary-950 dark:border-secondary-700"
                            required
                          />
                        </div>

                        <div class="flex flex-col gap-1">
                          <label class="text-caption font-bold text-secondary-600">Tanggal Pertemuan</label>
                          <input
                            type="date"
                            value={tanggalInput()}
                            onChange={(e) => setTanggalInput(e.currentTarget.value)}
                            class="border border-secondary-200 rounded-xl px-3 py-2 text-caption focus:outline-none focus:border-brand-500 text-secondary-950 dark:border-secondary-700"
                            required
                          />
                        </div>

                        <div class="flex flex-col gap-1">
                          <div class="flex items-center justify-between">
                            <label class="text-caption font-bold text-secondary-600 dark:text-secondary-300">
                              Jenis / Kategori Bimbingan
                            </label>
                            <Show when={auth.hasRole(['admin', 'super_admin', 'prodi', 'dosen'])}>
                              <button
                                type="button"
                                onClick={() => setShowKategoriModal(true)}
                                class="text-fine font-bold text-brand-600 hover:underline dark:text-brand-400"
                              >
                                + Kelola Kategori
                              </button>
                            </Show>
                          </div>
                          <select
                            value={kategoriInput() || ''}
                            onChange={(e) =>
                              setKategoriInput(e.currentTarget.value ? Number(e.currentTarget.value) : null)
                            }
                            class="border border-secondary-200 rounded-xl px-3 py-2 text-caption focus:outline-none focus:border-brand-500 text-secondary-950 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                          >
                            <option value="">-- Pilih Jenis Bimbingan (Opsional) --</option>
                            <For each={kategoriList()?.data || []}>
                              {(kat) => <option value={kat.id}>{kat.nama}</option>}
                            </For>
                          </select>
                        </div>
                        <div class="flex flex-col gap-1">
                          <label class="text-caption font-bold text-secondary-600">Topik Bimbingan</label>
                          <textarea
                            rows="3"
                            placeholder="Tulis topik bimbingan akademis/non-akademis..."
                            value={permasalahanInput()}
                            onInput={(e) => setPermasalahanInput(e.currentTarget.value)}
                            class="border border-secondary-200 rounded-xl p-3 text-caption focus:outline-none focus:border-brand-500 text-secondary-950 dark:border-secondary-700"
                            required
                          />
                        </div>

                        <div class="flex flex-col gap-1">
                          <label class="text-caption font-bold text-secondary-600">Solusi / Rekomendasi</label>
                          <textarea
                            rows="3"
                            placeholder="Tulis solusi atau tindakan yang direkomendasikan..."
                            value={solusiInput()}
                            onInput={(e) => setSolusiInput(e.currentTarget.value)}
                            class="border border-secondary-200 rounded-xl p-3 text-caption focus:outline-none focus:border-brand-500 text-secondary-950 dark:border-secondary-700"
                            required
                          />
                        </div>

                        <div class="flex items-center justify-between p-3 bg-brand-50/50 rounded-xl border border-brand-100/50">
                          <div class="flex flex-col">
                            <span class="text-caption font-bold text-brand-800">Lapor Beban Kerja Dosen (BKD)</span>
                            <span class="text-fine text-brand-600">Sertakan sesi ini ke laporan BKD resmi</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={statusBkdInput()}
                            onChange={(e) => setStatusBkdInput(e.currentTarget.checked)}
                            class="w-4 h-4 text-brand-600 border-brand-300 rounded focus:ring-brand-500"
                          />
                        </div>

                        <div class="flex justify-end gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setShowSesiModal(false)}
                            class="px-4 py-2 border border-secondary-200 text-secondary-600 font-bold rounded-xl text-caption dark:border-secondary-700"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            class="px-4 py-2 bg-brand-600 text-white font-bold rounded-xl text-caption hover:bg-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600"
                          >
                            Simpan Sesi
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </Show>
              </Show>
            </div>
          </div>
        </Show>
        {/* --- MODAL KELOLA KATEGORI BIMBINGAN --- */}
        <Show when={showKategoriModal()}>
          <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-5 dark:bg-secondary-900">
              <div class="flex items-center justify-between border-b pb-3 dark:border-secondary-800">
                <h3 class="font-bold text-secondary-800 text-base dark:text-white">⚙️ Kelola Kategori Bimbingan</h3>
                <button
                  type="button"
                  onClick={() => setShowKategoriModal(false)}
                  class="text-secondary-400 dark:text-secondary-300 hover:text-secondary-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Form Tambah Kategori Baru */}
              <form
                onSubmit={handleAddKategori}
                class="p-4 bg-secondary-50 border border-secondary-100 rounded-xl flex flex-col gap-3 dark:bg-secondary-800 dark:border-secondary-700"
              >
                <h4 class="font-bold text-caption text-secondary-800 dark:text-white">+ Tambah Kategori Baru</h4>
                <div class="flex flex-col gap-1">
                  <label class="text-fine font-semibold text-secondary-600 dark:text-secondary-300">
                    Nama Kategori
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Skripsi, Tugas Akhir, PKL..."
                    value={newKatNama()}
                    onInput={(e) => setNewKatNama(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-lg px-3 py-1.5 text-caption focus:outline-none focus:border-brand-500 text-secondary-950 dark:bg-secondary-900 dark:border-secondary-700 dark:text-white"
                    required
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-fine font-semibold text-secondary-600 dark:text-secondary-300">
                    Deskripsi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Penjelasan singkat kategori..."
                    value={newKatDeskripsi()}
                    onInput={(e) => setNewKatDeskripsi(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-lg px-3 py-1.5 text-caption focus:outline-none focus:border-brand-500 text-secondary-950 dark:bg-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  class="self-end px-3.5 py-1.5 bg-brand-600 text-white font-bold rounded-lg text-caption hover:bg-brand-700 dark:bg-brand-700 dark:hover:bg-brand-600"
                >
                  Simpan Kategori
                </button>
              </form>

              {/* Daftar Kategori Saat Ini */}
              <div class="flex flex-col gap-2">
                <h4 class="font-bold text-caption text-secondary-700 dark:text-white">Daftar Kategori Aktif</h4>
                <div class="max-h-48 overflow-y-auto divide-y divide-secondary-100 border rounded-xl dark:border-secondary-800 dark:divide-secondary-800">
                  <For each={kategoriList()?.data || []}>
                    {(kat) => (
                      <div class="p-3 flex items-center justify-between bg-white dark:bg-secondary-900">
                        <div class="flex flex-col">
                          <span class="font-bold text-caption text-secondary-800 dark:text-white">{kat.nama}</span>
                          <Show when={kat.deskripsi}>
                            <span class="text-fine text-secondary-400 dark:text-secondary-300">{kat.deskripsi}</span>
                          </Show>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteKategori(kat.id)}
                          class="text-rose-500 hover:text-rose-700 text-caption font-bold px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          Nonaktifkan
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* --- MODAL DETAIL PELANGGARAN --- */}
        <Show when={showPelanggaranDetail()}>
          <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 flex flex-col gap-5 dark:bg-secondary-900">
              <div class="flex items-center justify-between border-b pb-3 dark:border-secondary-800">
                <h3 class="font-bold text-secondary-800 text-base dark:text-white">🔴 Detail Pelanggaran</h3>
                <button
                  type="button"
                  onClick={() => setShowPelanggaranDetail(false)}
                  class="text-secondary-400 hover:text-secondary-600 font-bold text-lg dark:text-secondary-200"
                >
                  ✕
                </button>
              </div>

              <Show
                when={pelanggaranDetail()}
                fallback={
                  <div class="text-center text-secondary-400 dark:text-secondary-300 text-base py-10">
                    {pelanggaranDetail.loading ? 'Memuat data pelanggaran...' : 'Tidak ada data pelanggaran.'}
                  </div>
                }
              >
                {(detail: () => PelanggaranRekap) => (
                  <div class="flex flex-col gap-4">
                    <div class="grid grid-cols-3 gap-3 text-caption">
                      <div class="p-3 bg-rose-50 border border-rose-100 rounded-xl flex flex-col gap-0.5 dark:bg-rose-950/20 dark:border-rose-900/40">
                        <span class="text-fine text-rose-600 font-bold uppercase">Total Poin</span>
                        <span class="text-base font-bold text-rose-700 dark:text-rose-400">{detail().totalPoin}</span>
                      </div>
                      <div class="p-3 bg-rose-50 border border-rose-100 rounded-xl flex flex-col gap-0.5 dark:bg-rose-950/20 dark:border-rose-900/40">
                        <span class="text-fine text-rose-600 font-bold uppercase">Predikat</span>
                        <span class="text-base font-bold text-rose-700 dark:text-rose-400">{detail().predikat}</span>
                      </div>
                      <div class="p-3 bg-rose-50 border border-rose-100 rounded-xl flex flex-col gap-0.5 dark:bg-rose-950/20 dark:border-rose-900/40">
                        <span class="text-fine text-rose-600 font-bold uppercase">Jumlah</span>
                        <span class="text-base font-bold text-rose-700 dark:text-rose-400">
                          {detail().pelanggaranList.length} Pelanggaran
                        </span>
                      </div>
                    </div>

                    <div class="max-h-80 overflow-y-auto rounded-xl border border-secondary-100 dark:border-secondary-800">
                      <table class="w-full text-left text-caption">
                        <thead>
                          <tr class="border-b border-secondary-100 bg-secondary-50/60 text-secondary-500 dark:border-secondary-800 dark:bg-secondary-800 uppercase text-fine font-bold">
                            <th class="py-2.5 px-3">Tanggal</th>
                            <th class="py-2.5 px-3">Jenis / Pasal</th>
                            <th class="py-2.5 px-3">Poin</th>
                            <th class="py-2.5 px-3">Pelapor</th>
                            <th class="py-2.5 px-3">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-secondary-50 dark:divide-secondary-800">
                          <For each={detail().pelanggaranList}>
                            {(item) => (
                              <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40">
                                <td class="py-2.5 px-3 whitespace-nowrap">{fmtTanggal(item.tanggal)}</td>
                                <td class="py-2.5 px-3 text-secondary-700 dark:text-secondary-200">
                                  {item.jenisPelanggaran || item.nomorPasal || '-'}
                                </td>
                                <td class="py-2.5 px-3 font-bold text-rose-600 dark:text-rose-400">
                                  {item.bobotPoin ?? '-'}
                                </td>
                                <td class="py-2.5 px-3">{item.pelapor || '-'}</td>
                                <td
                                  class="py-2.5 px-3 max-w-[220px] truncate text-secondary-500 dark:text-secondary-300"
                                  title={item.keterangan}
                                >
                                  {item.keterangan || '-'}
                                </td>
                              </tr>
                            )}
                          </For>
                          <Show when={detail().pelanggaranList.length === 0}>
                            <tr>
                              <td colspan="5" class="py-8 text-center text-secondary-400 dark:text-secondary-300">
                                Tidak ada riwayat pelanggaran.
                              </td>
                            </tr>
                          </Show>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Show>

              <div class="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPelanggaranDetail(false)}
                  class="px-4 py-2 border border-secondary-200 text-secondary-600 font-bold rounded-xl text-caption active:scale-95 transition-all dark:border-secondary-700"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* --- MODAL DETAIL KOMPENSASI --- */}
        <Show when={showKompensasiDetail()}>
          <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 flex flex-col gap-5 dark:bg-secondary-900">
              <div class="flex items-center justify-between border-b pb-3 dark:border-secondary-800">
                <h3 class="font-bold text-secondary-800 text-base dark:text-white">🟠 Detail Kompensasi</h3>
                <button
                  type="button"
                  onClick={() => setShowKompensasiDetail(false)}
                  class="text-secondary-400 hover:text-secondary-600 font-bold text-lg dark:text-secondary-200"
                >
                  ✕
                </button>
              </div>

              <Show
                when={kompensasiDetail()}
                fallback={
                  <div class="text-center text-secondary-400 dark:text-secondary-300 text-base py-10">
                    {kompensasiDetail.loading ? 'Memuat data kompensasi...' : 'Tidak ada data kompensasi.'}
                  </div>
                }
              >
                {(detail: () => KompensasiDetailResponse) => (
                  <div class="flex flex-col gap-4">
                    <div class="grid grid-cols-3 gap-3 text-caption">
                      <div class="p-3 bg-orange-50 border border-orange-100 rounded-xl flex flex-col gap-0.5 dark:border-orange-800">
                        <span class="text-fine text-orange-600 font-bold uppercase">Total Kompensasi</span>
                        <span class="text-base font-bold text-orange-700">
                          {detail().summary.totalKompensasi} Menit
                        </span>
                      </div>
                      <div class="p-3 bg-orange-50 border border-orange-100 rounded-xl flex flex-col gap-0.5 dark:border-orange-800">
                        <span class="text-fine text-orange-600 font-bold uppercase">Sudah Dibayar</span>
                        <span class="text-base font-bold text-orange-700">{detail().summary.totalDibayar} Menit</span>
                      </div>
                      <div class="p-3 bg-orange-50 border border-orange-100 rounded-xl flex flex-col gap-0.5 dark:border-orange-800">
                        <span class="text-fine text-orange-600 font-bold uppercase">Sisa</span>
                        <span class="text-base font-bold text-orange-700">{detail().summary.sisaKompensasi} Menit</span>
                      </div>
                    </div>

                    <div>
                      <h4 class="font-bold text-caption text-secondary-700 mb-2 dark:text-white">Riwayat Kompensasi</h4>
                      <div class="max-h-56 overflow-y-auto rounded-xl border border-secondary-100 dark:border-secondary-800">
                        <table class="w-full text-left text-caption">
                          <thead>
                            <tr class="border-b border-secondary-100 bg-secondary-50/60 text-secondary-500 dark:border-secondary-800 dark:bg-secondary-800 uppercase text-fine font-bold">
                              <th class="py-2.5 px-3">Tanggal</th>
                              <th class="py-2.5 px-3">Sumber</th>
                              <th class="py-2.5 px-3">Status</th>
                              <th class="py-2.5 px-3">Durasi</th>
                              <th class="py-2.5 px-3">Poin</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-secondary-50 dark:divide-secondary-800">
                            <For each={detail().historyKompensasi}>
                              {(item) => (
                                <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40">
                                  <td class="py-2.5 px-3 whitespace-nowrap">{fmtTanggal(item.bapTanggal)}</td>
                                  <td class="py-2.5 px-3 capitalize">{item.sumber}</td>
                                  <td class="py-2.5 px-3 capitalize">{item.verifiedStatus || item.status}</td>
                                  <td class="py-2.5 px-3">{item.durasiMangkir} mnt</td>
                                  <td class="py-2.5 px-3 font-bold text-orange-600 dark:text-orange-400">
                                    {item.poinKompensasi}
                                  </td>
                                </tr>
                              )}
                            </For>
                            <Show when={detail().historyKompensasi.length === 0}>
                              <tr>
                                <td colspan="5" class="py-8 text-center text-secondary-400 dark:text-secondary-300">
                                  Tidak ada riwayat kompensasi.
                                </td>
                              </tr>
                            </Show>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 class="font-bold text-caption text-secondary-700 mb-2 dark:text-white">Riwayat Pembayaran</h4>
                      <div class="max-h-40 overflow-y-auto rounded-xl border border-secondary-100 dark:border-secondary-800">
                        <table class="w-full text-left text-caption">
                          <thead>
                            <tr class="border-b border-secondary-100 bg-secondary-50/60 text-secondary-500 dark:border-secondary-800 dark:bg-secondary-800 uppercase text-fine font-bold">
                              <th class="py-2.5 px-3">Tanggal</th>
                              <th class="py-2.5 px-3">Menit</th>
                              <th class="py-2.5 px-3">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-secondary-50 dark:divide-secondary-800">
                            <For each={detail().payments}>
                              {(item) => (
                                <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40">
                                  <td class="py-2.5 px-3 whitespace-nowrap">{fmtTanggal(item.tanggal)}</td>
                                  <td class="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                                    {item.jumlahMenit} mnt
                                  </td>
                                  <td class="py-2.5 px-3">{item.keterangan || '-'}</td>
                                </tr>
                              )}
                            </For>
                            <Show when={detail().payments.length === 0}>
                              <tr>
                                <td colspan="3" class="py-6 text-center text-secondary-400 dark:text-secondary-300">
                                  Belum ada pembayaran kompensasi.
                                </td>
                              </tr>
                            </Show>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </Show>

              <div class="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowKompensasiDetail(false)}
                  class="px-4 py-2 border border-secondary-200 text-secondary-600 font-bold rounded-xl text-caption active:scale-95 transition-all dark:border-secondary-700"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
