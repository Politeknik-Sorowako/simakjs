import { Show, createResource, createSignal, For } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { bimbinganController, Bimbingan as BimbinganData } from '../controllers/bimbinganController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { dosenController } from '../controllers/dosenController';
import { MainLayout } from '../components/MainLayout';

export default function Bimbingan() {
  const auth = useAuth();
  const user = () => auth.user();

  // Selected student for Dosen/Admin view
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  const [selectedMhsNama, setSelectedMhsNama] = createSignal<string>('');

  // Messages input
  const [messageText, setMessageText] = createSignal('');

  // Dosen inputs for ringkasan and approval
  const [ringkasanText, setRingkasanText] = createSignal('');
  const [isApprovedStatus, setIsApprovedStatus] = createSignal(false);

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

  // Load student's own bimbingan
  const [studentBimbingan, { refetch: refetchStudentBimb }] = createResource(
    () => mhsProfile()?.id,
    async (id) => {
      if (!id) return null;
      return await bimbinganController.getByMhsId(id);
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
      const dName = dosenProfile()?.nama;
      if (!dName) return [];
      return list.filter((item) => item.dosenPaNama === dName);
    }
    return list;
  };

  // Selected student bimbingan details
  const [selectedBimbingan, { refetch: refetchSelectedBimb }] = createResource(
    selectedMhsId,
    async (id) => {
      if (!id) return null;
      const bimb = await bimbinganController.getByMhsId(id);
      setRingkasanText(bimb.ringkasan || '');
      setIsApprovedStatus(bimb.isApproved);
      return bimb;
    }
  );

  const handleSendMessage = async (e: Event) => {
    e.preventDefault();
    const text = messageText().trim();
    if (!text) return;

    const targetId = user()?.role === 'mahasiswa' ? mhsProfile()?.id : selectedMhsId();
    if (!targetId) return;

    try {
      await bimbinganController.sendThread(targetId, text);
      setMessageText('');
      if (user()?.role === 'mahasiswa') {
        refetchStudentBimb();
      } else {
        refetchSelectedBimb();
      }
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
      alert('Bimbingan berhasil diperbarui.');
      refetchSelectedBimb();
      refetchMonitoring();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui bimbingan.');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-800 tracking-tight">Bimbingan Akademik</h1>
            <p class="text-sm text-gray-500">Modul bimbingan wali & persetujuan prasyarat UTS/UAS</p>
          </div>
          <Show when={user()?.role === 'mahasiswa' && studentBimbingan()}>
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-400 font-medium">Status Kelayakan Ujian:</span>
              <Show
                when={studentBimbingan()?.isApproved}
                fallback={
                  <span class="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-bold border border-rose-100 animate-pulse">
                    Belum Layak Ujian (Bimbingan Kurang)
                  </span>
                }
              >
                <span class="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
                  Disetujui Layak Ujian
                </span>
              </Show>
            </div>
          </Show>
        </div>

        {/* Content based on role */}
        <Show when={user()?.role === 'mahasiswa'}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Thread Panel */}
            <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[600px] overflow-hidden">
              <div class="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <h3 class="font-bold text-gray-800">Konsultasi Dosen PA</h3>
                <span class="text-xs text-gray-400 font-semibold">Live Chat</span>
              </div>

              {/* Message List */}
              <div class="flex-1 p-6 overflow-y-auto flex flex-col-reverse gap-4 bg-gray-50/30">
                <Show when={studentBimbingan()?.thread && studentBimbingan()!.thread.length > 0} fallback={
                  <div class="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <span class="text-4xl mb-2">💬</span>
                    <p class="text-gray-400 text-sm">Belum ada percakapan. Mulai bimbingan dengan mengirim pesan di bawah.</p>
                  </div>
                }>
                  <For each={studentBimbingan()?.thread}>
                    {(msg) => (
                      <div class={`flex flex-col max-w-[80%] ${msg.senderRole === 'mahasiswa' ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div class={`p-3 rounded-2xl text-sm ${msg.senderRole === 'mahasiswa' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'}`}>
                          {msg.pesan}
                        </div>
                        <span class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-medium">
                          {msg.senderRole} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </For>
                </Show>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} class="p-4 border-t border-gray-100 bg-white flex gap-3">
                <input
                  type="text"
                  placeholder="Tulis pesan bimbingan..."
                  value={messageText()}
                  onInput={(e) => setMessageText(e.currentTarget.value)}
                  class="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button
                  type="submit"
                  class="px-5 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
                >
                  Kirim
                </button>
              </form>
            </div>

            {/* Sidebar Ringkasan */}
            <div class="flex flex-col gap-6">
              <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                <h3 class="font-bold text-gray-800 border-b pb-2">Catatan Dosen PA</h3>
                <Show when={studentBimbingan()?.ringkasan} fallback={
                  <p class="text-sm text-gray-400 italic">Belum ada catatan atau ringkasan bimbingan dari Dosen PA Anda.</p>
                }>
                  <div class="p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-xl text-sm text-indigo-900 whitespace-pre-line leading-relaxed">
                    {studentBimbingan()?.ringkasan}
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </Show>

        {/* Dosen & Admin View */}
        <Show when={user()?.role === 'dosen' || user()?.role === 'admin'}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List Mahasiswa */}
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-[600px] flex flex-col">
              <div class="p-4 border-b border-gray-50 bg-gray-50/50">
                <h3 class="font-bold text-gray-800">
                  {user()?.role === 'dosen' ? 'Mahasiswa Bimbingan Anda' : 'Seluruh Progres Bimbingan'}
                </h3>
              </div>
              <div class="flex-1 overflow-y-auto">
                <Show when={filteredMonitoring().length > 0} fallback={
                  <div class="p-8 text-center text-gray-400 text-sm">Tidak ada mahasiswa terdaftar.</div>
                }>
                  <div class="divide-y divide-gray-50">
                    <For each={filteredMonitoring()}>
                      {(item) => (
                        <button
                          onClick={() => {
                            setSelectedMhsId(item.id);
                            setSelectedMhsNama(item.nama);
                          }}
                          class={`w-full p-4 text-left flex flex-col gap-1 transition-all hover:bg-blue-50/30 ${selectedMhsId() === item.id ? 'bg-blue-50/60 border-l-4 border-blue-600' : ''}`}
                        >
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-gray-800 text-sm">{item.nama}</span>
                            <Show
                              when={item.isApproved}
                              fallback={
                                <span class="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[10px] font-bold">
                                  Belum
                                </span>
                              }
                            >
                              <span class="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[10px] font-bold">
                                Layak
                              </span>
                            </Show>
                          </div>
                          <span class="text-xs text-gray-400">NIM: {item.nim}</span>
                          <Show when={user()?.role === 'admin'}>
                            <span class="text-[10px] text-gray-400 italic">PA: {item.dosenPaNama || 'Belum diplot'}</span>
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
                  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center p-12 h-[600px]">
                    <span class="text-5xl mb-4">👈</span>
                    <h3 class="font-bold text-gray-800 text-lg">Pilih Mahasiswa</h3>
                    <p class="text-gray-400 text-sm max-w-xs mt-1">Pilih salah satu mahasiswa dari daftar di sebelah kiri untuk melihat percakapan bimbingan & memberikan kelayakan ujian.</p>
                  </div>
                }
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px]">
                  {/* Chat Panel */}
                  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
                    <div class="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                      <h3 class="font-bold text-gray-800 text-sm">Chat: {selectedMhsNama()}</h3>
                    </div>
                    <div class="flex-1 p-4 overflow-y-auto flex flex-col-reverse gap-4 bg-gray-50/30">
                      <Show when={selectedBimbingan()?.thread && selectedBimbingan()!.thread.length > 0} fallback={
                        <div class="flex-1 flex flex-col items-center justify-center text-center p-6">
                          <span class="text-3xl mb-2">💬</span>
                          <p class="text-gray-400 text-xs">Belum ada obrolan.</p>
                        </div>
                      }>
                        <For each={selectedBimbingan()?.thread}>
                          {(msg) => (
                            <div class={`flex flex-col max-w-[85%] ${msg.senderRole === 'dosen' || msg.senderRole === 'admin' ? 'self-end items-end' : 'self-start items-start'}`}>
                              <div class={`p-3 rounded-2xl text-xs ${msg.senderRole === 'dosen' || msg.senderRole === 'admin' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'}`}>
                                {msg.pesan}
                              </div>
                              <span class="text-[9px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                                {msg.senderRole} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </For>
                      </Show>
                    </div>
                    <form onSubmit={handleSendMessage} class="p-3 border-t border-gray-100 bg-white flex gap-2">
                      <input
                        type="text"
                        placeholder="Balas konsultasi..."
                        value={messageText()}
                        onInput={(e) => setMessageText(e.currentTarget.value)}
                        class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                      />
                      <button type="submit" class="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700">
                        Kirim
                      </button>
                    </form>
                  </div>

                  {/* Form Approval & Ringkasan */}
                  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between h-full overflow-y-auto">
                    <form onSubmit={handleUpdateBimbingan} class="flex flex-col gap-4">
                      <h3 class="font-bold text-gray-800 text-sm border-b pb-2">Tindakan Dosen PA</h3>

                      {/* Approval Toggle */}
                      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div class="flex flex-col">
                          <span class="text-xs font-bold text-gray-700">Setujui Kelayakan Ujian</span>
                          <span class="text-[10px] text-gray-400">Persetujuan untuk UTS & UAS</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isApprovedStatus()}
                          onChange={(e) => setIsApprovedStatus(e.currentTarget.checked)}
                          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>

                      {/* Summary Text Area */}
                      <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-gray-700">Ringkasan Bimbingan & Masukan</label>
                        <textarea
                          rows="8"
                          placeholder="Tulis ringkasan konsultasi mahasiswa di sini..."
                          value={ringkasanText()}
                          onInput={(e) => setRingkasanText(e.currentTarget.value)}
                          class="border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        class="w-full mt-2 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-100"
                      >
                        Simpan Perubahan
                      </button>
                    </form>
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
