import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { evaluasiKurikulumController } from '../controllers/evaluasiKurikulumController';
import { kurikulumController } from '../controllers/kurikulumController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { prodiController } from '../controllers/prodiController';

export default function EvaluasiKurikulum() {
  const toast = useToast();
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);
  const [kurikulumFilter, setKurikulumFilter] = createSignal<number | undefined>(undefined);
  const [periodeFilter, setPeriodeFilter] = createSignal<string | undefined>(undefined);
  const [page, setPage] = createSignal(1);

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [kurikulums] = createResource(
    () => prodiFilter(),
    async (prodiId) => {
      if (!prodiId) return [];
      const res = await kurikulumController.getAll('', 1, 100, prodiId);
      return res.data;
    },
  );

  const [periodes] = createResource(() => periodeAkademikController.getAll());

  const [evaluasiList] = createResource(
    () => ({ kurikulumId: kurikulumFilter(), periodeId: periodeFilter(), page: page() }),
    async ({ kurikulumId, periodeId, page }) => {
      if (!kurikulumId) return null;
      return evaluasiKurikulumController.getAll({ page, limit: 10, kurikulumId, periodeId });
    },
  );

  const [showForm, setShowForm] = createSignal(false);
  const [formData, setFormData] = createSignal({
    aspek: '',
    temuan: '',
    rekomendasi: '',
    tindakLanjut: '',
    status: 'open',
  });

  const handleCreate = async () => {
    const data = formData();
    if (!data.aspek || !data.temuan) {
      toast.showToast('Aspek dan Temuan wajib diisi', 'error');
      return;
    }
    try {
      await evaluasiKurikulumController.create({
        kurikulumId: kurikulumFilter()!,
        periodeId: periodeFilter() || null,
        ...data,
      });
      toast.showToast('Evaluasi berhasil ditambahkan', 'success');
      setShowForm(false);
      setFormData({ aspek: '', temuan: '', rekomendasi: '', tindakLanjut: '', status: 'open' });
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menambahkan evaluasi', 'error');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await evaluasiKurikulumController.update(id, { status });
      toast.showToast('Status berhasil diupdate', 'success');
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal update status', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="warning">Open</Badge>;
      case 'in_progress':
        return <Badge variant="info">In Progress</Badge>;
      case 'closed':
        return <Badge variant="success">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-white">Evaluasi Kurikulum (PPEPP)</h1>
          <Show when={kurikulumFilter()}>
            <Button onClick={() => setShowForm(!showForm())}>{showForm() ? 'Tutup Form' : 'Tambah Evaluasi'}</Button>
          </Show>
        </div>

        <div class="flex gap-4 items-center flex-wrap">
          <div class="w-64">
            <Input
              type="select"
              placeholder="Program Studi"
              value={prodiFilter() ?? ''}
              onInput={(e: any) => {
                const val = e.currentTarget.value;
                setProdiFilter(val ? Number(val) : undefined);
                setKurikulumFilter(undefined);
              }}
              isSelect
              selectOptions={[
                { value: '', label: 'Pilih Program Studi' },
                ...(prodis()?.data?.map((p) => ({ value: String(p.id), label: `${p.kode} - ${p.nama}` })) || []),
              ]}
            />
          </div>
          <Show when={prodiFilter()}>
            <div class="w-64">
              <Input
                type="select"
                placeholder="Kurikulum"
                value={kurikulumFilter() ?? ''}
                onInput={(e: any) =>
                  setKurikulumFilter(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)
                }
                isSelect
                selectOptions={[
                  { value: '', label: 'Pilih Kurikulum' },
                  ...(kurikulums()?.map((k) => ({ value: String(k.id), label: k.nama })) || []),
                ]}
              />
            </div>
          </Show>
          <div class="w-48">
            <Input
              type="select"
              placeholder="Periode"
              value={periodeFilter() ?? ''}
              onInput={(e: any) => setPeriodeFilter(e.currentTarget.value || undefined)}
              isSelect
              selectOptions={[
                { value: '', label: 'Semua Periode' },
                ...(periodes()?.map((p) => ({ value: p.id, label: p.nama })) || []),
              ]}
            />
          </div>
        </div>

        <Show when={showForm()}>
          <Card variant="bordered" padding="lg">
            <h2 class="text-lg font-semibold text-white mb-4">Form Evaluasi Baru</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-secondary-200 mb-1">Aspek *</label>
                <Input
                  type="text"
                  placeholder="Contoh: Pembelajaran, Kurikulum, Sarana"
                  value={formData().aspek}
                  onInput={(e: any) => setFormData({ ...formData(), aspek: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="block text-sm text-secondary-200 mb-1">Temuan *</label>
                <textarea
                  class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white min-h-[100px]"
                  placeholder="Deskripsikan temuan evaluasi..."
                  value={formData().temuan}
                  onInput={(e: any) => setFormData({ ...formData(), temuan: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="block text-sm text-secondary-200 mb-1">Rekomendasi</label>
                <textarea
                  class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white min-h-[80px]"
                  placeholder="Rekomendasi perbaikan..."
                  value={formData().rekomendasi}
                  onInput={(e: any) => setFormData({ ...formData(), rekomendasi: e.currentTarget.value })}
                />
              </div>
              <div>
                <label class="block text-sm text-secondary-200 mb-1">Tindak Lanjut</label>
                <textarea
                  class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white min-h-[80px]"
                  placeholder="Tindak lanjut yang dilakukan..."
                  value={formData().tindakLanjut}
                  onInput={(e: any) => setFormData({ ...formData(), tindakLanjut: e.currentTarget.value })}
                />
              </div>
              <div class="flex gap-2">
                <Button onClick={handleCreate}>Simpan Evaluasi</Button>
                <Button variant="secondary" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
              </div>
            </div>
          </Card>
        </Show>

        <Show when={evaluasiList() && !evaluasiList.loading}>
          {(data) => (
            <Card variant="bordered" padding="lg">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-white">Daftar Evaluasi</h2>
                <Badge variant="info">{data().meta.total} total</Badge>
              </div>

              <Show when={data().data.length > 0}>
                <div class="space-y-3">
                  <For each={data().data}>
                    {(item) => (
                      <div class="border border-slate-700 rounded-lg p-4 bg-slate-800/50">
                        <div class="flex items-start justify-between mb-2">
                          <div>
                            <h3 class="text-white font-medium">{item.aspek}</h3>
                            <p class="text-xs text-secondary-400">
                              {item.periode?.nama || 'Semua Periode'} • {new Date(item.createdAt).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <div class="flex items-center gap-2">
                            {getStatusBadge(item.status)}
                            <select
                              class="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                              value={item.status}
                              onChange={(e) => handleStatusChange(item.id, e.currentTarget.value)}
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                        </div>
                        <div class="space-y-2 text-sm">
                          <div>
                            <span class="text-secondary-400">Temuan: </span>
                            <span class="text-white">{item.temuan}</span>
                          </div>
                          <Show when={item.rekomendasi}>
                            <div>
                              <span class="text-secondary-400">Rekomendasi: </span>
                              <span class="text-emerald-400">{item.rekomendasi}</span>
                            </div>
                          </Show>
                          <Show when={item.tindakLanjut}>
                            <div>
                              <span class="text-secondary-400">Tindak Lanjut: </span>
                              <span class="text-blue-400">{item.tindakLanjut}</span>
                            </div>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              <Show when={data().data.length === 0}>
                <p class="text-secondary-400 text-center py-8">Belum ada evaluasi untuk kurikulum ini.</p>
              </Show>

              <Show when={data().meta.totalPages > 1}>
                <div class="flex justify-center gap-2 mt-4">
                  <Button
                    variant="secondary"
                    disabled={page() <= 1}
                    onClick={() => setPage(page() - 1)}
                  >
                    Prev
                  </Button>
                  <span class="text-white px-4 py-2">
                    {page()} / {data().meta.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={page() >= data().meta.totalPages}
                    onClick={() => setPage(page() + 1)}
                  >
                    Next
                  </Button>
                </div>
              </Show>
            </Card>
          )}
        </Show>

        <Show when={!kurikulumFilter()}>
          <Card variant="bordered" padding="lg">
            <p class="text-secondary-400 text-center">Pilih Program Studi dan Kurikulum untuk melihat evaluasi.</p>
          </Card>
        </Show>
      </div>
    </MainLayout>
  );
}
