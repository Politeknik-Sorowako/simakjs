import { Show, createResource, createSignal, For, createEffect, onCleanup } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { bimbinganController, BimbinganThread } from '../controllers/bimbinganController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { dosenController } from '../controllers/dosenController';
import { MainLayout } from '../components/MainLayout';

export default function Bimbingan() {
  const auth = useAuth();
  const user = () => auth.user();

  // Selected student for Dosen/Admin view
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  const [selectedMhsNama, setSelectedMhsNama] = createSignal<string>('');

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
  const [tanggalInput, setTanggalInput] = createSignal(new Date().toISOString().split('T')[0]);
  const [permasalahanInput, setPermasalahanInput] = createSignal('');
  const [solusiInput, setSolusiInput] = createSignal('');
  const [statusBkdInput, setStatusBkdInput] = createSignal(true);

  // Load Akademik Summary Resource
  const [akademikSummary, { refetch: refetchAkademik }] = createResource(
    () => (user()?.role === 'mahasiswa' ? mhsProfile()?.id : selectedMhsId()),
    async (id) => {
      if (!id) return null;
      return await bimbinganController.getAkademikSummary(id);
    }
  );

  // Load profiles
  const [mhsProfile] = createResource(
    () => {
      if (user()?.role === 'mahasiswa') return user()?.email;
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await mahasiswaController.getAll(email, 1, 1);
      return res.data[0] || null;
    }
  );

  const [dosenProfile] = createResource(
    () => {
      if (user()?.role === 'dosen') return user()?.email;
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await dosenController.getAll(email, 1, 1);
      return res.data[0] || null;
    }
  );

  // Rekap BKD Modal Signals
  const [showRekapBkdModal, setShowRekapBkdModal] = createSignal(false);
  const [rekapBkdData, { refetch: refetchRekapBkd }] = createResource(
    () => ({ open: showRekapBkdModal(), pId: selectedPeriode(), dProfile: dosenProfile() }),
    async ({ open, pId, dProfile }) => {
      if (!open) return { data: [] };
      return await bimbinganController.getRekapBkd(dProfile?.id || undefined, pId || undefined);
    }
  );

  // Load student's own bimbingan (active or selected period)
  const [studentBimbingan, { refetch: refetchStudentBimb }] = createResource(
    () => ({ id: mhsProfile()?.id, period: selectedPeriode() }),
    async ({ id, period }) => {
      if (!id) return null;
      return await bimbinganController.getByMhsId(id, period || undefined);
    }
  );

  // Load Dosen/Admin monitoring data
  const [monitoringList, { refetch: refetchMonitoring }] = createResource(
    () => {
      if (user()?.role === 'admin' || user()?.role === 'dosen') return true;
      return null;
    },
    async () => {
      return await bimbinganController.getMonitoring();
    }
  );

  // Filtered monitoring list for Dosen (only their wargi/wali)
  const filteredMonitoring = () => {
    const list = monitoringList() || [];
    if (user()?.role === 'dosen') {
      const dId = dosenProfile()?.id;
      if (!dId) return [];
      return list.filter((item) => item.dosenPaId === dId);
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
    }
  );

  // Sync messages from resource to local signal
  createEffect(() => {
    const activeBimb = user()?.role === 'mahasiswa' ? studentBimbingan() : selectedBimbingan();
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
    const activeBimb = user()?.role === 'mahasiswa' ? studentBimbingan() : selectedBimbingan();
    if (ws) {
      ws.close();
      ws = null;
    }
    if (activeBimb && activeBimb.id) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const jwtToken = auth.token() || '';
      // Connect to Elysia WebSocket with token auth
      ws = new WebSocket(`${protocol}//${host}/api/bimbingan/ws/${activeBimb.id}?token=${encodeURIComponent(jwtToken)}`);
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
    return user()?.role === 'mahasiswa' ? studentBimbingan() : selectedBimbingan();
  };

  const handleSendMessage = async (e: Event) => {
    e.preventDefault();
    const text = messageText().trim();
    if (!text) return;

    const targetId = user()?.role === 'mahasiswa' ? mhsProfile()?.id : selectedMhsId();
    if (!targetId) return;

    try {
      const newMsg = await bimbinganController.sendThread(targetId, text, chatType());
      setMessageText('');
      // Optimistic/immediate local update
      setMessages((prev) => [newMsg, ...prev]);
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim pesan.');
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
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui bimbingan.');
    }
  };

  const handleClearChat = async () => {
    const targetId = user()?.role === 'mahasiswa' ? mhsProfile()?.id : selectedMhsId();
    if (!targetId) return;
    if (!confirm('Apakah Anda yakin ingin mengosongkan seluruh pesan obrolan di thread ini?')) return;

    try {
      await bimbinganController.clearChatThread(targetId);
      setMessages([]);
      alert('Pesan obrolan berhasil dikosongkan.');
    } catch (err: any) {
      alert(err.message || 'Gagal mengosongkan obrolan.');
    }
  };

  const handleOpenAddSesi = () => {
    setEditingSesiId(null);
    const activeBimb = selectedBimbingan();
    const currentCount = activeBimb?.sesi?.length || 0;
    setPertemuanKeInput(currentCount + 1);
    setTanggalInput(new Date().toISOString().split('T')[0]);
    setPermasalahanInput('');
    setSolusiInput('');
    setStatusBkdInput(true);
    setShowSesiModal(true);
  };

  const handleOpenEditSesi = (sesi: any) => {
    setEditingSesiId(sesi.id);
    setPertemuanKeInput(sesi.pertemuanKe);
    setTanggalInput(new Date(sesi.tanggalBimbingan).toISOString().split('T')[0]);
    setPermasalahanInput(sesi.permasalahan);
    setSolusiInput(sesi.solusi);
    setStatusBkdInput(sesi.statusBkd);
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
      };

      if (editingSesiId()) {
        await bimbinganController.updateSesi(editingSesiId()!, payload);
      } else {
        await bimbinganController.addSesi(targetMhsId, payload);
      }

      setShowSesiModal(false);
      refetchSelectedBimb();
      refetchMonitoring();
      refetchRekapBkd();
      refetchAkademik();
      alert('Sesi bimbingan berhasil disimpan.');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan sesi bimbingan.');
    }
  };

  const handleDeleteSesi = async (sesiId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus sesi bimbingan ini?')) return;
    try {
      await bimbinganController.deleteSesi(sesiId);
      refetchSelectedBimb();
      refetchMonitoring();
      refetchRekapBkd();
      refetchAkademik();
      alert('Sesi bimbingan berhasil dihapus.');
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus sesi bimbingan.');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm print:hidden">
          <div>
            <h1 class="text-2xl font-extrabold text-brand-gray-800 tracking-tight">Bimbingan Akademik</h1>
            <p class="text-sm text-brand-gray-500">Modul bimbingan wali & persetujuan prasyarat UTS/UAS</p>
          </div>
          
          {/* Status Kelayakan (Mahasiswa) & Dropdown Periode */}
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Show when={user()?.role === 'dosen' || user()?.role === 'admin' || user()?.role === 'prodi'}>
              <button
                onClick={() => setShowRekapBkdModal(true)}
                class="px-3 py-1.5 bg-brand-800 text-white font-bold rounded-lg text-xs hover:bg-brand-900 transition-colors flex items-center gap-1.5"
              >
                🖨️ Cetak Laporan BKD
              </button>
            </Show>

            <Show when={currentBimbinganData()?.availablePeriodes}>
              <div class="flex items-center gap-2">
                <span class="text-xs text-brand-gray-400 font-semibold uppercase">Periode:</span>
                <select
                  class="border border-brand-gray-200 rounded-lg px-2.5 py-1 text-xs bg-white focus:outline-none text-slate-900"
                  value={selectedPeriode() || currentBimbinganData()?.periodeId}
                  onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
                >
                  <For each={currentBimbinganData()?.availablePeriodes}>
                    {(p) => <option value={p}>{p}</option>}
                  </For>
                </select>
              </div>
            </Show>

            <Show when={user()?.role === 'mahasiswa' && studentBimbingan()}>
              <div class="flex items-center gap-3">
                <span class="text-sm text-brand-gray-400 font-medium">Ujian:</span>
                <Show
                  when={studentBimbingan()?.isApproved}
                  fallback={
                    <span class="px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold border border-red-100">
                      Bimbingan Kurang
                    </span>
                  }
                >
                  <span class="px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
                    Layak Ujian
                  </span>
                </Show>
              </div>
            </Show>
          </div>
        </div>

        {/* --- MAHASISWA VIEW --- */}
        <Show when={user()?.role === 'mahasiswa'}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            {/* Chat Thread Panel */}
            <div class="lg:col-span-2 bg-white rounded-2xl border border-brand-gray-100 shadow-sm flex flex-col h-[600px] overflow-hidden">
              <div class="p-4 border-b border-brand-gray-50 bg-brand-50/50 flex items-center justify-between">
                <h3 class="font-bold text-brand-gray-800">Konsultasi Dosen PA</h3>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 bg-brand-50 text-brand-900 text-[10px] font-bold rounded">UTS: {utsCount()}/1</span>
                  <span class="px-2 py-0.5 bg-brand-50 text-brand-900 text-[10px] font-bold rounded">UAS: {uasCount()}/3</span>
                </div>
              </div>

              {/* Message List */}
              <div class="flex-1 p-6 overflow-y-auto flex flex-col-reverse gap-4 bg-brand-50/30">
                <Show when={messages().length > 0} fallback={
                  <div class="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <span class="text-4xl mb-2">💬</span>
                    <p class="text-brand-gray-400 text-sm">Belum ada percakapan. Mulai bimbingan dengan mengirim pesan di bawah.</p>
                  </div>
                }>
                  <For each={messages()}>
                    {(msg) => (
                      <div class={`flex flex-col max-w-[80%] ${msg.senderRole === 'mahasiswa' ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div class={`p-3 rounded-2xl text-sm ${msg.senderRole === 'mahasiswa' ? 'bg-brand-800 text-white rounded-tr-none' : 'bg-white text-brand-gray-800 border border-brand-gray-100 rounded-tl-none shadow-sm'}`}>
                          {msg.pesan}
                        </div>
                        <span class="text-[10px] text-brand-gray-400 mt-1 uppercase tracking-wider font-medium">
                          {msg.senderRole} • {msg.tipe.toUpperCase()} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </For>
                </Show>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} class="p-4 border-t border-brand-gray-100 bg-white flex flex-col gap-3">
                <div class="flex items-center gap-4 text-xs font-semibold text-brand-gray-500">
                  <span>Tipe Bimbingan:</span>
                  <label class="flex items-center gap-1.5 cursor-pointer text-slate-900">
                    <input
                      type="radio"
                      name="chatType"
                      checked={chatType() === 'uts'}
                      onChange={() => setChatType('uts')}
                    />
                    Persiapan UTS
                  </label>
                  <label class="flex items-center gap-1.5 cursor-pointer text-slate-900">
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
                    class="flex-1 border border-brand-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100 transition-all text-slate-900"
                  />
                  <button
                    type="submit"
                    class="px-5 py-3 bg-brand-800 text-white font-bold rounded-xl text-sm hover:bg-brand-900 active:scale-95 transition-all shadow-sm shadow-brand-200"
                  >
                    Kirim
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar Ringkasan */}
            <div class="flex flex-col gap-6">
              <div class="bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm flex flex-col gap-4">
                <h3 class="font-bold text-brand-gray-800 border-b pb-2">Catatan Dosen PA</h3>
                
                <Show when={studentBimbingan()?.ringkasan}>
                  <div class="flex flex-col gap-1">
                    <span class="text-[10px] font-bold text-brand-gray-400 uppercase tracking-wider">Catatan Kelayakan / Ringkasan</span>
                    <div class="p-3 bg-brand-50/50 border border-brand-100/50 rounded-xl text-xs text-brand-900 leading-relaxed">
                      {studentBimbingan()?.ringkasan}
                    </div>
                  </div>
                </Show>

                <div class="flex flex-col gap-3">
                  <span class="text-[10px] font-bold text-brand-gray-400 uppercase tracking-wider block">Riwayat Sesi Pertemuan</span>
                  <Show when={studentBimbingan()?.sesi && studentBimbingan()!.sesi.length > 0} fallback={
                    <p class="text-xs text-brand-gray-400 italic">Belum ada sesi bimbingan yang tercatat.</p>
                  }>
                    <For each={studentBimbingan()?.sesi}>
                      {(sesi) => (
                        <div class="p-3 bg-brand-50 border border-brand-gray-150 rounded-xl flex flex-col gap-2">
                          <div class="flex items-center justify-between border-b pb-1">
                            <span class="font-bold text-xs text-brand-gray-700">Pertemuan Ke-{sesi.pertemuanKe}</span>
                            <span class="text-[10px] text-brand-gray-400 font-mono">
                              {new Date(sesi.tanggalBimbingan).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                            </span>
                          </div>
                          <div class="flex flex-col gap-1">
                            <span class="text-[9px] font-bold text-red-500 uppercase">Permasalahan:</span>
                            <p class="text-xs text-brand-gray-800 whitespace-pre-wrap leading-relaxed">{sesi.permasalahan}</p>
                          </div>
                          <div class="flex flex-col gap-1">
                            <span class="text-[9px] font-bold text-green-600 uppercase">Solusi / Masukan:</span>
                            <p class="text-xs text-brand-gray-800 whitespace-pre-wrap leading-relaxed">{sesi.solusi}</p>
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
        <Show when={user()?.role === 'dosen' || user()?.role === 'admin'}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
            {/* List Mahasiswa */}
            <div class="bg-white rounded-2xl border border-brand-gray-100 shadow-sm overflow-hidden h-[600px] flex flex-col">
              <div class="p-4 border-b border-brand-gray-50 bg-brand-50/50">
                <h3 class="font-bold text-brand-gray-800">
                  {user()?.role === 'dosen' ? 'Mahasiswa Bimbingan Anda' : 'Seluruh Progres Bimbingan'}
                </h3>
              </div>
              <div class="flex-1 overflow-y-auto">
                <Show when={filteredMonitoring().length > 0} fallback={
                  <div class="p-8 text-center text-brand-gray-400 text-sm">Tidak ada mahasiswa terdaftar.</div>
                }>
                  <div class="divide-y divide-gray-50">
                    <For each={filteredMonitoring()}>
                      {(item) => (
                        <button
                          onClick={() => {
                            setSelectedMhsId(item.id);
                            setSelectedMhsNama(item.nama);
                          }}
                          class={`w-full p-4 text-left flex flex-col gap-1 transition-all hover:bg-brand-50/30 ${selectedMhsId() === item.id ? 'bg-brand-50/60 border-l-4 border-brand-800' : ''}`}
                        >
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-brand-gray-800 text-sm">{item.nama}</span>
                            <Show
                              when={item.isApproved}
                              fallback={
                                <span class="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[10px] font-bold">
                                  Belum
                                </span>
                              }
                            >
                              <span class="px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded text-[10px] font-bold">
                                Layak
                              </span>
                            </Show>
                          </div>
                          <span class="text-xs text-brand-gray-400">NIM: {item.nim}</span>
                          <Show when={user()?.role === 'admin'}>
                            <span class="text-[10px] text-brand-gray-400 italic">PA: {item.dosenPaNama || 'Belum diplot'}</span>
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
                  <div class="bg-white rounded-2xl border border-brand-gray-100 shadow-sm flex flex-col items-center justify-center text-center p-12 h-[600px]">
                    <span class="text-5xl mb-4">👈</span>
                    <h3 class="font-bold text-brand-gray-800 text-lg">Pilih Mahasiswa</h3>
                    <p class="text-brand-gray-400 text-sm max-w-xs mt-1">Pilih salah satu mahasiswa dari daftar di sebelah kiri untuk melihat percakapan bimbingan & memberikan kelayakan ujian.</p>
                  </div>
                }
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px]">
                  {/* Chat Panel */}
                  <div class="bg-white rounded-2xl border border-brand-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
                    <div class="p-4 border-b border-brand-gray-50 bg-brand-50/50 flex items-center justify-between">
                      <div class="flex flex-col">
                        <h3 class="font-bold text-brand-gray-800 text-sm">Chat: {selectedMhsNama()}</h3>
                        <button
                          type="button"
                          onClick={handleClearChat}
                          class="text-[10px] text-red-500 hover:text-red-700 font-bold mt-0.5 text-left"
                        >
                          🗑️ Kosongkan Chat
                        </button>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 bg-brand-50 text-brand-900 text-[9px] font-bold rounded">UTS: {utsCount()}/1</span>
                        <span class="px-1.5 py-0.5 bg-brand-50 text-brand-900 text-[9px] font-bold rounded">UAS: {uasCount()}/3</span>
                      </div>
                    </div>
                    
                    <div class="flex-1 p-4 overflow-y-auto flex flex-col-reverse gap-4 bg-brand-50/30">
                      <Show when={messages().length > 0} fallback={
                        <div class="flex-1 flex flex-col items-center justify-center text-center p-6">
                          <span class="text-3xl mb-2">💬</span>
                          <p class="text-brand-gray-400 text-xs">Belum ada obrolan.</p>
                        </div>
                      }>
                        <For each={messages()}>
                          {(msg) => (
                            <div class={`flex flex-col max-w-[85%] ${msg.senderRole === 'dosen' || msg.senderRole === 'admin' ? 'self-end items-end' : 'self-start items-start'}`}>
                              <div class={`p-3 rounded-2xl text-xs ${msg.senderRole === 'dosen' || msg.senderRole === 'admin' ? 'bg-brand-800 text-white rounded-tr-none' : 'bg-white text-brand-gray-800 border border-brand-gray-100 rounded-tl-none shadow-sm'}`}>
                                {msg.pesan}
                              </div>
                              <span class="text-[9px] text-brand-gray-400 mt-1 uppercase tracking-wider font-semibold">
                                {msg.senderRole} • {msg.tipe.toUpperCase()} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </For>
                      </Show>
                    </div>

                    <form onSubmit={handleSendMessage} class="p-3 border-t border-brand-gray-100 bg-white flex flex-col gap-2">
                      <div class="flex items-center gap-3 text-[10px] font-semibold text-brand-gray-400">
                        <span>Kategori Pesan:</span>
                        <label class="flex items-center gap-1 cursor-pointer text-slate-900">
                          <input
                            type="radio"
                            name="lecturerChatType"
                            checked={chatType() === 'uts'}
                            onChange={() => setChatType('uts')}
                          />
                          UTS
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer text-slate-900">
                          <input
                            type="radio"
                            name="lecturerChatType"
                            checked={chatType() === 'uas'}
                            onChange={() => setChatType('uas')}
                          />
                          UAS
                        </label>
                      </div>

                      <div class="flex gap-2">
                        <input
                          type="text"
                          placeholder="Balas konsultasi..."
                          value={messageText()}
                          onInput={(e) => setMessageText(e.currentTarget.value)}
                          class="flex-1 border border-brand-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-700 text-slate-900"
                        />
                        <button type="submit" class="px-4 py-2 bg-brand-800 text-white font-bold rounded-xl text-xs hover:bg-brand-900">
                          Kirim
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Form Approval, Resume Akademik, & Timeline Sesi */}
                  <div class="bg-white rounded-2xl border border-brand-gray-100 shadow-sm p-6 flex flex-col gap-6 h-full overflow-y-auto">
                    
                    {/* Resume Akademik */}
                    <div class="flex flex-col gap-3">
                      <h3 class="font-extrabold text-brand-gray-800 text-sm border-b pb-2">📊 Resume Akademik</h3>
                      <div class="grid grid-cols-2 gap-3 text-xs">
                        <div class="p-3 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-0.5">
                          <span class="text-[10px] text-red-600 font-bold uppercase">Pelanggaran</span>
                          <span class="text-sm font-black text-red-700">{akademikSummary()?.poinPelanggaran || 0} Poin</span>
                        </div>
                        <div class="p-3 bg-orange-50 border border-orange-100 rounded-xl flex flex-col gap-0.5">
                          <span class="text-[10px] text-orange-600 font-bold uppercase">Jam Kompensasi</span>
                          <span class="text-sm font-black text-orange-700">{akademikSummary()?.sisaKompensasi || 0} Menit</span>
                        </div>
                        <div class="p-3 bg-green-50 border border-green-100 rounded-xl flex flex-col gap-0.5">
                          <span class="text-[10px] text-green-600 font-bold uppercase">IPK Kumulatif</span>
                          <span class="text-sm font-black text-green-700">{akademikSummary()?.ipk || '0.00'}</span>
                        </div>
                        <div class="p-3 bg-brand-50 border border-brand-100 rounded-xl flex flex-col gap-0.5">
                          <span class="text-[10px] text-brand-800 font-bold uppercase">IPS Sem. Lalu</span>
                          <span class="text-sm font-black text-brand-900">{akademikSummary()?.ipsSemesterLalu || '0.00'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Sesi Bimbingan */}
                    <div class="flex flex-col gap-3">
                      <div class="flex justify-between items-center border-b pb-2">
                        <h3 class="font-extrabold text-brand-gray-800 text-sm">📅 Sesi Bimbingan</h3>
                        <button
                          type="button"
                          onClick={handleOpenAddSesi}
                          class="px-2.5 py-1 bg-brand-800 text-white font-bold rounded-lg text-[10px] hover:bg-brand-900"
                        >
                          + Tambah Sesi
                        </button>
                      </div>

                      <div class="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto">
                        <Show when={selectedBimbingan()?.sesi && selectedBimbingan()!.sesi.length > 0} fallback={
                          <p class="text-xs text-brand-gray-400 italic">Belum ada sesi bimbingan. Minimal 3 kali per semester.</p>
                        }>
                          <For each={selectedBimbingan()?.sesi}>
                            {(sesi) => (
                              <div class="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-1.5 relative">
                                <div class="flex items-center justify-between border-b border-slate-200 pb-1">
                                  <span class="font-bold text-xs text-slate-700">Sesi Ke-{sesi.pertemuanKe}</span>
                                  <div class="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditSesi(sesi)}
                                      class="text-[10px] text-brand-800 font-bold"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSesi(sesi.id)}
                                      class="text-[10px] text-red-500 font-bold"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </div>
                                <p class="text-[10px] text-slate-400">Tanggal: {new Date(sesi.tanggalBimbingan).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
                                <p class="text-xs text-slate-800"><strong class="text-red-600 text-[10px] block uppercase">Permasalahan:</strong> {sesi.permasalahan}</p>
                                <p class="text-xs text-slate-800"><strong class="text-green-600 text-[10px] block uppercase">Solusi:</strong> {sesi.solusi}</p>
                                <div class="mt-1 flex items-center justify-between text-[10px]">
                                  <span class="text-brand-gray-400 font-semibold">Lapor BKD:</span>
                                  <span class={`font-bold px-1.5 py-0.5 rounded text-[9px] ${sesi.statusBkd ? 'bg-green-100 text-green-700' : 'bg-brand-150 text-brand-gray-500'}`}>
                                    {sesi.statusBkd ? 'YA' : 'TIDAK'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </For>
                        </Show>
                      </div>
                    </div>

                    {/* Ringkasan & Approval */}
                    <form onSubmit={handleUpdateBimbingan} class="flex flex-col gap-4 border-t pt-4">
                      <h3 class="font-extrabold text-brand-gray-800 text-sm">🔑 Status Kelayakan & Ringkasan</h3>
                      
                      <div class="flex items-center justify-between p-3 bg-brand-50 rounded-xl border border-brand-gray-100">
                        <div class="flex flex-col">
                          <span class="text-xs font-bold text-brand-gray-700">Setujui Kelayakan Ujian</span>
                          <span class="text-[10px] text-brand-gray-400">Persetujuan kelayakan UTS & UAS</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isApprovedStatus()}
                          onChange={(e) => setIsApprovedStatus(e.currentTarget.checked)}
                          class="w-4 h-4 text-brand-800 border-brand-gray-300 rounded focus:ring-brand-700"
                        />
                      </div>

                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-brand-gray-700">Ringkasan Bimbingan / Masukan Global</label>
                        <textarea
                          rows="2"
                          placeholder="Ringkasan bimbingan untuk satu semester..."
                          value={ringkasanText()}
                          onInput={(e) => setRingkasanText(e.currentTarget.value)}
                          class="border border-brand-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-700 text-slate-950 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        class="w-full py-2.5 bg-brand-800 text-white font-bold rounded-xl text-xs hover:bg-brand-900 transition-all shadow-sm"
                      >
                        Update Kelayakan & Ringkasan
                      </button>
                    </form>

                  </div>

                  {/* --- MODAL TAMBAH / EDIT SESI BIMBINGAN --- */}
                  <Show when={showSesiModal()}>
                    <div class="fixed inset-0 bg-brand-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
                        <h3 class="font-extrabold text-brand-gray-800 text-base">
                          {editingSesiId() ? 'Edit Sesi Bimbingan' : 'Tambah Sesi Bimbingan'}
                        </h3>
                        
                        <form onSubmit={handleSaveSesi} class="flex flex-col gap-4">
                          <div class="flex flex-col gap-1">
                            <label class="text-xs font-bold text-brand-gray-650">Pertemuan Ke</label>
                            <input
                              type="number"
                              min="1"
                              value={pertemuanKeInput()}
                              onInput={(e) => setPertemuanKeInput(parseInt(e.currentTarget.value) || 1)}
                              class="border border-brand-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-700 text-slate-950"
                              required
                            />
                          </div>

                          <div class="flex flex-col gap-1">
                            <label class="text-xs font-bold text-brand-gray-650">Tanggal Pertemuan</label>
                            <input
                              type="date"
                              value={tanggalInput()}
                              onChange={(e) => setTanggalInput(e.currentTarget.value)}
                              class="border border-brand-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-700 text-slate-950"
                              required
                            />
                          </div>

                          <div class="flex flex-col gap-1">
                            <label class="text-xs font-bold text-brand-gray-650">Permasalahan</label>
                            <textarea
                              rows="3"
                              placeholder="Tulis permasalahan akademis/non-akademis..."
                              value={permasalahanInput()}
                              onInput={(e) => setPermasalahanInput(e.currentTarget.value)}
                              class="border border-brand-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-700 text-slate-950"
                              required
                            />
                          </div>

                          <div class="flex flex-col gap-1">
                            <label class="text-xs font-bold text-brand-gray-650">Solusi / Rekomendasi</label>
                            <textarea
                              rows="3"
                              placeholder="Tulis solusi atau tindakan yang direkomendasikan..."
                              value={solusiInput()}
                              onInput={(e) => setSolusiInput(e.currentTarget.value)}
                              class="border border-brand-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-700 text-slate-950"
                              required
                            />
                          </div>

                          <div class="flex items-center justify-between p-3 bg-brand-50/50 rounded-xl border border-brand-100/50">
                            <div class="flex flex-col">
                              <span class="text-xs font-bold text-brand-900">Lapor Beban Kerja Dosen (BKD)</span>
                              <span class="text-[10px] text-brand-800">Sertakan sesi ini ke laporan BKD resmi</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={statusBkdInput()}
                              onChange={(e) => setStatusBkdInput(e.currentTarget.checked)}
                              class="w-4 h-4 text-brand-800 border-brand-300 rounded focus:ring-brand-700"
                            />
                          </div>

                          <div class="flex justify-end gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => setShowSesiModal(false)}
                              class="px-4 py-2 border border-brand-gray-200 text-brand-gray-600 font-bold rounded-xl text-xs"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              class="px-4 py-2 bg-brand-800 text-white font-bold rounded-xl text-xs hover:bg-brand-900"
                            >
                              Simpan Sesi
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* --- MODAL PRATINJAU / CETAK REKAP BKD --- */}
        <Show when={showRekapBkdModal()}>
          <div class="fixed inset-0 bg-brand-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-0">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-5xl p-8 flex flex-col gap-4 print:shadow-none print:p-0 print:max-w-full">
              {/* Modal header (hidden in print) */}
              <div class="flex justify-between items-center border-b pb-3 print:hidden">
                <h3 class="font-extrabold text-brand-gray-800 text-base">Pratinjau Laporan BKD Bimbingan Akademik</h3>
                <div class="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    class="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    🖨️ Cetak / Unduh PDF
                  </button>
                  <button
                    onClick={() => setShowRekapBkdModal(false)}
                    class="px-3.5 py-2 border border-brand-gray-200 hover:bg-brand-50 text-brand-gray-600 font-bold rounded-xl text-xs"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Printable Area */}
              <div class="flex flex-col gap-4 font-serif" id="print-area-bkd">
                {/* Kop Surat */}
                <div class="flex flex-col items-center justify-center border-b-2 border-double border-brand-gray-800 pb-4 text-center">
                  <h2 class="text-xl font-bold tracking-wider text-brand-gray-900">POLITEKNIK SOROWAKO</h2>
                  <p class="text-[10px] text-brand-gray-500 italic mt-0.5">Program Diploma Terapan / Sarjana Terapan Teknik Informatika</p>
                  <p class="text-[9px] text-brand-gray-400 mt-0.5">Website: simak.politeknik-sorowako.ac.id | Telp: +62 475 321 000</p>
                </div>

                {/* Surat Title */}
                <div class="text-center my-3">
                  <h3 class="text-sm font-extrabold text-brand-gray-900 tracking-wide uppercase underline">REKAPITULASI CATATAN BIMBINGAN AKADEMIK DOSEN WALI</h3>
                  <p class="text-xs text-brand-gray-600 mt-1">
                    Periode Akademik: <span class="font-bold">{selectedPeriode() || currentBimbinganData()?.periodeId}</span>
                  </p>
                </div>

                {/* Meta data */}
                <div class="grid grid-cols-2 text-xs text-brand-gray-800 gap-2 border bg-brand-50/50 p-4 rounded-xl print:border-none print:bg-transparent print:p-0">
                  <p>Nama Dosen PA: <span class="font-bold">{dosenProfile()?.nama || 'Dosen Wali'}</span></p>
                  <p>NIP Dosen: <span class="font-bold">{dosenProfile()?.nip || '-'}</span></p>
                  <p>Tanggal Cetak: <span class="font-bold">{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</span></p>
                </div>

                {/* BKD Table */}
                <div class="overflow-x-auto">
                  <table class="w-full border-collapse border border-brand-gray-300 text-[11px] text-left">
                    <thead>
                      <tr class="bg-brand-100 text-brand-gray-800 font-bold">
                        <th class="border border-brand-gray-300 p-2.5 w-8 text-center">No</th>
                        <th class="border border-brand-gray-300 p-2.5 w-44">Nama Mahasiswa</th>
                        <th class="border border-brand-gray-300 p-2.5 w-24 text-center">NIM</th>
                        <th class="border border-brand-gray-300 p-2.5 w-20 text-center">Total Sesi</th>
                        <th class="border border-brand-gray-300 p-2.5">Permasalahan</th>
                        <th class="border border-brand-gray-300 p-2.5">Solusi / Saran Masukan</th>
                        <th class="border border-brand-gray-300 p-2.5 w-28 text-center">Tanggal Sesi</th>
                        <th class="border border-brand-gray-300 p-2.5 w-20 text-center">Lapor BKD</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For
                        each={rekapBkdData()?.data}
                        fallback={
                          <tr>
                            <td colspan="8" class="border border-brand-gray-300 p-6 text-center text-brand-gray-400 italic">
                              Tidak ada riwayat bimbingan resmi tercatat untuk periode ini.
                            </td>
                          </tr>
                        }
                      >
                        {(item, idx) => (
                          <tr class="hover:bg-brand-50/50">
                            <td class="border border-brand-gray-300 p-2.5 text-center">{idx() + 1}</td>
                            <td class="border border-brand-gray-300 p-2.5 font-bold">{item.mahasiswa?.nama}</td>
                            <td class="border border-brand-gray-300 p-2.5 text-center">{item.mahasiswa?.nim}</td>
                            <td class="border border-brand-gray-300 p-2.5 text-center font-bold">{item.totalSesi || 0} Kali</td>
                            <td class="border border-brand-gray-300 p-2 text-xs leading-relaxed">
                              <For each={item.sesi}>
                                {(s) => (
                                  <div class="mb-1.5 pb-1.5 border-b border-brand-gray-100 last:border-0 last:mb-0 last:pb-0">
                                    <strong>P-{s.pertemuanKe}:</strong> {s.permasalahan}
                                  </div>
                                )}
                              </For>
                              <Show when={!item.sesi || item.sesi.length === 0}>
                                <span class="text-brand-gray-400 italic">-</span>
                              </Show>
                            </td>
                            <td class="border border-brand-gray-300 p-2 text-xs leading-relaxed">
                              <For each={item.sesi}>
                                {(s) => (
                                  <div class="mb-1.5 pb-1.5 border-b border-brand-gray-100 last:border-0 last:mb-0 last:pb-0">
                                    <strong>P-{s.pertemuanKe}:</strong> {s.solusi}
                                  </div>
                                )}
                              </For>
                              <Show when={!item.sesi || item.sesi.length === 0}>
                                <span class="text-brand-gray-400 italic">-</span>
                              </Show>
                            </td>
                            <td class="border border-brand-gray-300 p-2 text-center text-xs">
                              <For each={item.sesi}>
                                {(s) => (
                                  <div class="mb-1.5 pb-1.5 border-b border-brand-gray-100 last:border-0 last:mb-0 last:pb-0 font-mono">
                                    {new Date(s.tanggalBimbingan).toLocaleDateString('id-ID', { dateStyle: 'short' })}
                                  </div>
                                )}
                              </For>
                              <Show when={!item.sesi || item.sesi.length === 0}>
                                <span class="text-brand-gray-400 italic">-</span>
                              </Show>
                            </td>
                            <td class="border border-brand-gray-300 p-2.5 text-center">
                              <span class={`px-2 py-0.5 rounded font-extrabold text-[9px] ${item.statusBkd ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-brand-150 text-brand-gray-500'}`}>
                                {item.statusBkd ? 'YA' : 'TIDAK'}
                              </span>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan */}
                <div class="flex justify-end mt-12 print:mt-20">
                  <div class="text-center text-xs text-brand-gray-800 flex flex-col gap-16">
                    <p>Dosen Penasehat Akademik,</p>
                    <div>
                      <p class="font-extrabold underline">{dosenProfile()?.nama}</p>
                      <p class="text-[10px] text-brand-gray-500">NIP. {dosenProfile()?.nip || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
