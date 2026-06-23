import { createSignal, createEffect, For, Show } from 'solid-js';

export default function App() {
  const [token, setToken] = createSignal(localStorage.getItem('token') || '');
  const [user, setUser] = createSignal<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [role, setRole] = createSignal('mahasiswa');
  const [isRegister, setIsRegister] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');

  // Dashboard Data
  const [prodis, setProdis] = createSignal<any[]>([]);
  const [mahasiswas, setMahasiswas] = createSignal<any[]>([]);
  
  // Form Data
  const [newProdiKode, setNewProdiKode] = createSignal('');
  const [newProdiNama, setNewProdiNama] = createSignal('');
  const [newProdiJenjang, setNewProdiJenjang] = createSignal('D3');

  const [newMhsNim, setNewMhsNim] = createSignal('');
  const [newMhsNama, setNewMhsNama] = createSignal('');
  const [newMhsEmail, setNewMhsEmail] = createSignal('');
  const [newMhsProdiId, setNewMhsProdiId] = createSignal(0);

  const API_URL = 'http://localhost:3000';

  // Load data if authenticated
  createEffect(() => {
    if (token()) {
      fetchProdis();
      fetchMahasiswas();
    }
  });

  const fetchProdis = async () => {
    try {
      const res = await fetch(`${API_URL}/prodi`);
      if (res.ok) {
        const data = await res.json();
        setProdis(data);
        if (data.length > 0 && newMhsProdiId() === 0) {
          setNewMhsProdiId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMahasiswas = async () => {
    try {
      const res = await fetch(`${API_URL}/mahasiswa`);
      if (res.ok) {
        setMahasiswas(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAuth = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    const path = isRegister() ? '/auth/register' : '/auth/login';
    const body = isRegister()
      ? { email: email(), password: password(), role: role() }
      : { email: email(), password: password() };

    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Terjadi kesalahan');
        return;
      }
      if (isRegister()) {
        setIsRegister(false);
        setErrorMsg('Registrasi sukses. Silakan login.');
      } else {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (e) {
      setErrorMsg('Gagal terhubung ke server');
    }
  };

  const handleAddProdi = async (e: Event) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/prodi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token()}`,
        },
        body: JSON.stringify({
          kode: newProdiKode(),
          nama: newProdiNama(),
          jenjang: newProdiJenjang(),
        }),
      });
      if (res.ok) {
        setNewProdiKode('');
        setNewProdiNama('');
        fetchProdis();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menambahkan Prodi');
      }
    } catch (e) {
      alert('Error saat menghubungi server');
    }
  };

  const handleAddMahasiswa = async (e: Event) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/mahasiswa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token()}`,
        },
        body: JSON.stringify({
          nim: newMhsNim(),
          nama: newMhsNama(),
          email: newMhsEmail(),
          programStudiId: Number(newMhsProdiId()),
        }),
      });
      if (res.ok) {
        setNewMhsNim('');
        setNewMhsNama('');
        setNewMhsEmail('');
        fetchMahasiswas();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menambahkan Mahasiswa');
      }
    } catch (e) {
      alert('Error saat menghubungi server');
    }
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <div class="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <header class="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 class="text-xl font-bold">SIMAK Vokasi</h1>
        <Show when={token()}>
          <div class="flex items-center gap-4">
            <span class="text-sm bg-blue-700 px-3 py-1 rounded-full">
              {user()?.email} ({user()?.role})
            </span>
            <button onClick={logout} class="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition-colors">
              Logout
            </button>
          </div>
        </Show>
      </header>

      <main class="flex-grow container mx-auto p-6 max-w-6xl">
        <Show
          when={token()}
          fallback={
            <div class="max-w-md mx-auto mt-16 bg-white p-8 rounded-lg shadow-md">
              <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">
                {isRegister() ? 'Registrasi Akun' : 'Masuk ke Sistem'}
              </h2>
              {errorMsg() && (
                <div class="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm text-center">
                  {errorMsg()}
                </div>
              )}
              <form onSubmit={handleAuth} class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={email()}
                    onInput={(e) => setEmail(e.currentTarget.value)}
                    class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    value={password()}
                    onInput={(e) => setPassword(e.currentTarget.value)}
                    class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <Show when={isRegister()}>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={role()}
                      onChange={(e) => setRole(e.currentTarget.value)}
                      class="mt-1 block w-full rounded border-gray-300 shadow-sm p-2 border"
                    >
                      <option value="mahasiswa">Mahasiswa</option>
                      <option value="dosen">Dosen</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </Show>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-semibold transition-colors">
                  {isRegister() ? 'Daftar' : 'Login'}
                </button>
              </form>
              <div class="mt-4 text-center">
                <button
                  onClick={() => {
                    setIsRegister(!isRegister());
                    setErrorMsg('');
                  }}
                  class="text-blue-600 hover:underline text-sm"
                >
                  {isRegister() ? 'Sudah punya akun? Login' : 'Belum punya akun? Daftar'}
                </button>
              </div>
            </div>
          }
        >
          {/* Main Dashboard UI */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Side: Master Forms (Restricted to Admin/Dosen) */}
            <div class="space-y-6">
              <Show when={user()?.role === 'admin'}>
                <div class="bg-white p-6 rounded-lg shadow-md">
                  <h3 class="text-lg font-bold mb-4 text-blue-600 border-b pb-2">Tambah Program Studi</h3>
                  <form onSubmit={handleAddProdi} class="space-y-3">
                    <input
                      type="text"
                      placeholder="Kode Prodi"
                      required
                      value={newProdiKode()}
                      onInput={(e) => setNewProdiKode(e.currentTarget.value)}
                      class="w-full p-2 border rounded"
                    />
                    <input
                      type="text"
                      placeholder="Nama Prodi"
                      required
                      value={newProdiNama()}
                      onInput={(e) => setNewProdiNama(e.currentTarget.value)}
                      class="w-full p-2 border rounded"
                    />
                    <select
                      value={newProdiJenjang()}
                      onChange={(e) => setNewProdiJenjang(e.currentTarget.value)}
                      class="w-full p-2 border rounded"
                    >
                      <option value="D3">D3</option>
                      <option value="D4">D4</option>
                    </select>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-semibold">
                      Simpan Prodi
                    </button>
                  </form>
                </div>
              </Show>

              <Show when={user()?.role === 'admin' || user()?.role === 'dosen'}>
                <div class="bg-white p-6 rounded-lg shadow-md">
                  <h3 class="text-lg font-bold mb-4 text-blue-600 border-b pb-2">Tambah Mahasiswa</h3>
                  <form onSubmit={handleAddMahasiswa} class="space-y-3">
                    <input
                      type="text"
                      placeholder="NIM"
                      required
                      value={newMhsNim()}
                      onInput={(e) => setNewMhsNim(e.currentTarget.value)}
                      class="w-full p-2 border rounded"
                    />
                    <input
                      type="text"
                      placeholder="Nama Mahasiswa"
                      required
                      value={newMhsNama()}
                      onInput={(e) => setNewMhsNama(e.currentTarget.value)}
                      class="w-full p-2 border rounded"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      required
                      value={newMhsEmail()}
                      onInput={(e) => setNewMhsEmail(e.currentTarget.value)}
                      class="w-full p-2 border rounded"
                    />
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Program Studi</label>
                      <select
                        value={newMhsProdiId()}
                        onChange={(e) => setNewMhsProdiId(Number(e.currentTarget.value))}
                        class="w-full p-2 border rounded"
                      >
                        <For each={prodis()}>
                          {(p) => <option value={p.id}>{p.jenjang} - {p.nama}</option>}
                        </For>
                      </select>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-semibold">
                      Simpan Mahasiswa
                    </button>
                  </form>
                </div>
              </Show>
            </div>

            {/* Right Side: Data Tables */}
            <div class="md:col-span-2 space-y-6">
              {/* Program Studi List */}
              <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-lg font-bold mb-4 text-gray-800">Daftar Program Studi</h3>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Kode</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Nama</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Jenjang</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <For each={prodis()}>
                        {(p) => (
                          <tr>
                            <td class="px-4 py-2 text-sm">{p.kode}</td>
                            <td class="px-4 py-2 text-sm">{p.nama}</td>
                            <td class="px-4 py-2 text-sm font-semibold text-blue-600">{p.jenjang}</td>
                          </tr>
                        )}
                      </For>
                      <Show when={prodis().length === 0}>
                        <tr>
                          <td colspan="3" class="px-4 py-4 text-center text-sm text-gray-400">Belum ada data prodi.</td>
                        </tr>
                      </Show>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mahasiswa List */}
              <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-lg font-bold mb-4 text-gray-800">Daftar Mahasiswa</h3>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">NIM</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Nama</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Email</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <For each={mahasiswas()}>
                        {(m) => (
                          <tr>
                            <td class="px-4 py-2 text-sm">{m.nim}</td>
                            <td class="px-4 py-2 text-sm">{m.nama}</td>
                            <td class="px-4 py-2 text-sm text-gray-500">{m.email}</td>
                            <td class="px-4 py-2 text-sm">
                              <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-semibold">{m.status}</span>
                            </td>
                          </tr>
                        )}
                      </For>
                      <Show when={mahasiswas().length === 0}>
                        <tr>
                          <td colspan="4" class="px-4 py-4 text-center text-sm text-gray-400">Belum ada data mahasiswa.</td>
                        </tr>
                      </Show>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}
