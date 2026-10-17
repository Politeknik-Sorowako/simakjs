import { createEffect, createMemo, createResource, createSignal, For, onMount, Show } from 'solid-js';
import KopSurat, { KOPI_FALLBACK } from '../components/cetak/KopSurat';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { IconActionButton } from '../components/ui/IconActionButton';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { StudentAvatar } from '../components/ui/StudentAvatar';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  bimbinganController,
  Pelanggaran as IPelanggaran,
  MahasiswaTxlyItem,
} from '../controllers/bimbinganController';
import { Mahasiswa, mahasiswaController } from '../controllers/mahasiswaController';
import { pasalController } from '../controllers/pasalController';
import { PeriodeAkademik, periodeAkademikController } from '../controllers/periodeAkademikController';
import { Prodi, prodiController } from '../controllers/prodiController';
import { systemController } from '../controllers/systemController';
import { usePagination } from '../hooks/usePagination';
import { ExportColumn, exportToExcel, exportToPDF } from '../utils/export';
import { fmtTanggal, getTodayString } from '../utils/format';

export default function Pelanggaran() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();
  const isStaff = () => auth.hasRole(['admin', 'dosen', 'prodi', 'instruktur', 'super_admin']);
  // Kop surat global — dipakai modal SP & popup cetak SP.
  const [kop] = createResource(() => systemController.getKop().catch(() => null));
  const [kopLogoSrc] = createResource(
    () => kop(),
    (k) => (k ? systemController.kopLogoObjectUrl(k) : null),
  );

  // Student Profile (if logged in as student)
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

  // Load student's own violations
  const [studentViolations, { refetch: refetchStudentViolations }] = createResource(
    () => mhsProfile()?.id,
    async (id) => {
      if (!id) return null;
      return await bimbinganController.getPelanggaranByMhsId(id);
    },
  );

  // Load all violations (for Staff: Admin/Dosen/Prodi/Instruktur)
  const [allViolations, { refetch: refetchAllViolations }] = createResource(
    () => {
      if (isStaff()) return true;
      return null;
    },
    async () => {
      const res = await bimbinganController.getAllPelanggaran();
      return Array.isArray(res) ? res : res?.data || [];
    },
  );

  // Client-side search + sort for the violations table
  type SortField = 'tanggal' | 'namaMahasiswa' | 'nim' | 'prodiNama' | 'jenisPelanggaran' | 'pelapor' | 'jenisSanksi';
  const [violationSearch, setViolationSearch] = createSignal('');
  const [sortField, setSortField] = createSignal<SortField>('tanggal');
  const [sortDir, setSortDir] = createSignal<'asc' | 'desc'>('desc');

  // Filter tambahan untuk tab Daftar Pelanggaran
  const [filterProdiId, setFilterProdiId] = createSignal<number | undefined>(undefined);
  const [filterPeriodeId, setFilterPeriodeId] = createSignal<string | undefined>(undefined);
  const [filterStartDate, setFilterStartDate] = createSignal('');
  const [filterEndDate, setFilterEndDate] = createSignal('');

  // Master Program Studi dan Periode Akademik
  const [prodiList] = createResource(async () => {
    try {
      const res = await prodiController.getAll('', 1, 100);
      return res.data || [];
    } catch {
      return [];
    }
  });

  const [periodeList] = createResource(async () => {
    try {
      const res = await periodeAkademikController.getAll('', 1, 50);
      return res.data || [];
    } catch {
      return [];
    }
  });

  // Pagination state
  const { page, limit, setPage, setLimit, resetPage } = usePagination();
  const pageOptions = [10, 20, 50, 100];
  const handleLimitChange = (newLimit: number) => setLimit(newLimit);

  const toggleSort = (field: SortField) => {
    if (sortField() === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'tanggal' ? 'desc' : 'asc');
    }
    resetPage();
  };

  const visibleViolations = createMemo(() => {
    const list = allViolations() || [];
    const q = violationSearch().trim().toLowerCase();
    const pid = filterProdiId();
    const perId = filterPeriodeId();
    const sDate = filterStartDate();
    const eDate = filterEndDate();

    let rows = list;

    if (pid) {
      rows = rows.filter((v) => v.programStudiId === pid);
    }
    if (perId) {
      rows = rows.filter((v) => v.periodeId === perId);
    }
    if (sDate) {
      rows = rows.filter((v) => v.tanggal >= sDate);
    }
    if (eDate) {
      rows = rows.filter((v) => v.tanggal <= eDate);
    }
    if (q) {
      rows = rows.filter((v) => {
        const haystack = [
          v.namaMahasiswa,
          v.nim,
          v.prodiNama,
          v.jenisPelanggaran,
          v.nomorPasal,
          v.pelapor,
          v.keterangan,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    const field = sortField();
    const dir = sortDir() === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (field === 'tanggal') {
        cmp = new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
      } else if (field === 'jenisSanksi') {
        cmp = (a.jenisSanksi || 0) - (b.jenisSanksi || 0);
      } else {
        const av = String(a[field] || '');
        const bv = String(b[field] || '');
        cmp = av.localeCompare(bv, 'id', { sensitivity: 'base' });
      }
      return cmp * dir;
    });
  });

  const totalPages = createMemo(() => Math.ceil(visibleViolations().length / limit()) || 1);
  const paginatedViolations = createMemo(() => {
    const start = (page() - 1) * limit();
    return visibleViolations().slice(start, start + limit());
  });

  // Ekspor Columns & Handlers
  const exportColumns: ExportColumn<IPelanggaran>[] = [
    { header: 'No', accessor: (_r, idx) => (idx !== undefined ? idx + 1 : '-') },
    { header: 'Tanggal', accessor: (r) => fmtTanggal(r.tanggal) },
    { header: 'NIM', accessor: (r) => r.nim || '-' },
    { header: 'Nama Mahasiswa', accessor: (r) => r.namaMahasiswa || '-' },
    { header: 'Program Studi', accessor: (r) => r.prodiNama || '-' },
    { header: 'Pasal BPA', accessor: (r) => r.nomorPasal || '-' },
    { header: 'Jenis Pelanggaran', accessor: (r) => r.jenisPelanggaran },
    {
      header: 'Tingkat Sanksi',
      accessor: (r) => (r.jenisSanksi === 4 ? 'Peringatan Tertulis (-1.00)' : 'Peringatan Lisan (-0.25)'),
    },
    { header: 'Pelapor', accessor: (r) => r.pelapor || '-' },
    { header: 'Keterangan', accessor: (r) => r.keterangan },
  ];

  const handleExportExcel = () => {
    const data = visibleViolations();
    if (!data.length) {
      toast.showToast('Tidak ada data pelanggaran untuk diekspor', 'info');
      return;
    }
    exportToExcel(data, exportColumns, `Daftar_Pelanggaran_${getTodayString()}`);
    toast.showToast('Data pelanggaran berhasil diekspor (.xlsx)', 'success');
  };

  const handleExportPDF = () => {
    const data = visibleViolations();
    if (!data.length) {
      toast.showToast('Tidak ada data pelanggaran untuk diekspor', 'info');
      return;
    }
    exportToPDF(
      data,
      exportColumns,
      `Daftar_Pelanggaran_${getTodayString()}`,
      'DAFTAR TINDAKAN INDISIPLINER MAHASISWA',
      'Politeknik Sorowako - Sistem Informasi Akademik & Kedisiplinan',
    );
    toast.showToast('Dokumen PDF pelanggaran berhasil dibuat (.pdf)', 'success');
  };

  // Ekspor Columns & Handlers untuk Tab Mahasiswa TXLY
  const exportMhsTxlyColumns: ExportColumn<MahasiswaTxlyItem>[] = [
    { header: 'No', accessor: (_r, idx) => (idx !== undefined ? idx + 1 : '-') },
    { header: 'NIM', accessor: (r) => r.nim },
    { header: 'Nama Mahasiswa', accessor: (r) => r.nama },
    { header: 'Program Studi', accessor: (r) => r.prodiNama || '-' },
    { header: 'Semester', accessor: (r) => (r.semester ? `Semester ${r.semester}` : '-') },
    { header: 'Jumlah Pelanggaran', accessor: (r) => r.jumlahPelanggaran },
    { header: 'Predikat TXLY', accessor: (r) => r.predikat },
    { header: 'Total Poin', accessor: (r) => r.totalPoin },
    { header: 'Degradasi Mutu Sikap', accessor: (r) => `-${r.degradasiNilaiSikap}` },
  ];

  const handleExportMhsTxlyExcel = () => {
    const data = visibleMahasiswaTxly();
    if (!data.length) {
      toast.showToast('Tidak ada data mahasiswa kedisiplinan untuk diekspor', 'info');
      return;
    }
    exportToExcel(data, exportMhsTxlyColumns, `Daftar_Mahasiswa_TXLY_${getTodayString()}`);
    toast.showToast('Data mahasiswa kedisiplinan berhasil diekspor (.xlsx)', 'success');
  };

  const handleExportMhsTxlyPDF = () => {
    const data = visibleMahasiswaTxly();
    if (!data.length) {
      toast.showToast('Tidak ada data mahasiswa kedisiplinan untuk diekspor', 'info');
      return;
    }
    exportToPDF(
      data,
      exportMhsTxlyColumns,
      `Daftar_Mahasiswa_TXLY_${getTodayString()}`,
      'DAFTAR MAHASISWA & PREDIKAT KEDISIPLINAN TXLY',
      'Politeknik Sorowako - Sistem Informasi Akademik & Kedisiplinan',
    );
    toast.showToast('Dokumen PDF mahasiswa kedisiplinan berhasil dibuat (.pdf)', 'success');
  };

  // Ekspor Columns & Handlers untuk Modal Riwayat Pelanggaran Mahasiswa
  const exportMhsDetailColumns: ExportColumn<IPelanggaran>[] = [
    { header: 'No', accessor: (_r, idx) => (idx !== undefined ? idx + 1 : '-') },
    { header: 'Tanggal', accessor: (r) => fmtTanggal(r.tanggal) },
    { header: 'Pasal BPA', accessor: (r) => r.nomorPasal || '-' },
    { header: 'Jenis Pelanggaran', accessor: (r) => r.jenisPelanggaran },
    {
      header: 'Tingkat Sanksi',
      accessor: (r) => (r.jenisSanksi === 4 ? 'Peringatan Tertulis (-1.00)' : 'Peringatan Lisan (-0.25)'),
    },
    { header: 'Pelapor', accessor: (r) => r.pelapor || '-' },
    { header: 'Keterangan', accessor: (r) => r.keterangan },
  ];

  const handleExportDetailExcel = () => {
    const m = selectedMhsDetail();
    const list = mhsViolationsDetail()?.pelanggaranList || [];
    if (!list.length) {
      toast.showToast('Tidak ada riwayat pelanggaran untuk diekspor', 'info');
      return;
    }
    exportToExcel(list, exportMhsDetailColumns, `Riwayat_Pelanggaran_${m?.nim || ''}_${getTodayString()}`);
    toast.showToast('Riwayat pelanggaran mahasiswa berhasil diekspor (.xlsx)', 'success');
  };

  const handleExportDetailPDF = () => {
    const m = selectedMhsDetail();
    const list = mhsViolationsDetail()?.pelanggaranList || [];
    if (!list.length) {
      toast.showToast('Tidak ada riwayat pelanggaran untuk diekspor', 'info');
      return;
    }
    exportToPDF(
      list,
      exportMhsDetailColumns,
      `Riwayat_Pelanggaran_${m?.nim || ''}_${getTodayString()}`,
      `RIWAYAT TINDAKAN INDISIPLINER MAHASISWA: ${m?.nama || ''} (${m?.nim || ''})`,
      `Program Studi: ${m?.prodiNama || '-'} | Predikat TXLY: ${m?.predikat || '-'} | Total Poin: ${m?.totalPoin ?? 0}`,
    );
    toast.showToast('Dokumen PDF riwayat pelanggaran berhasil dibuat (.pdf)', 'success');
  };

  // Load master pasal BPA (global + prodi scoped)
  const [pasalList] = createResource(
    () => (isStaff() ? true : null),
    async () => {
      if (!isStaff()) return [];
      return await pasalController.getAll();
    },
  );
  const [showImportModal, setShowImportModal] = createSignal(false);

  // Server-side search + lazy-load list of active students for the form dropdown
  const MAHASISWA_PAGE_SIZE = 50;
  const [mahasiswaList, setMahasiswaList] = createSignal<Mahasiswa[]>([]);
  const [mahasiswaSearch, setMahasiswaSearch] = createSignal('');
  const [mahasiswaPage, setMahasiswaPage] = createSignal(1);
  const [mahasiswaHasMore, setMahasiswaHasMore] = createSignal(false);
  const [mahasiswaLoading, setMahasiswaLoading] = createSignal(false);

  const fetchMahasiswa = async (page: number, search: string, append: boolean) => {
    if (!isStaff()) return;
    setMahasiswaLoading(true);
    try {
      const res = await mahasiswaController.getAll(search || undefined, page, MAHASISWA_PAGE_SIZE, undefined, {
        filterStatus: 'aktif',
        allStudents: true,
      });
      setMahasiswaList((prev) => (append ? [...prev, ...res.data] : res.data));
      setMahasiswaPage(page + 1);
      setMahasiswaHasMore(page < (res.meta?.totalPages || 1));
    } catch {
      // silently ignore search errors
    } finally {
      setMahasiswaLoading(false);
    }
  };

  onMount(() => {
    fetchMahasiswa(1, '', false);
  });

  const handleMahasiswaSearch = (q: string) => {
    setMahasiswaSearch(q);
    fetchMahasiswa(1, q, false);
  };

  const handleMahasiswaLoadMore = () => {
    if (mahasiswaHasMore() && !mahasiswaLoading()) {
      fetchMahasiswa(mahasiswaPage(), mahasiswaSearch(), true);
    }
  };

  const ensureStudentLoaded = async (id: number) => {
    if (mahasiswaList().some((m) => m.id === id)) return;
    try {
      const m = await mahasiswaController.getById(id, true);
      if (m && !mahasiswaList().some((x) => x.id === m.id)) {
        setMahasiswaList((prev) => [m, ...prev]);
      }
    } catch {
      // ignore
    }
  };

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [mahasiswaId, setMahasiswaId] = createSignal(0);
  const [tanggal, setTanggal] = createSignal('');
  const [jenisPelanggaran, setJenisPelanggaran] = createSignal('');
  const [keterangan, setKeterangan] = createSignal('');
  const [pasalId, setPasalId] = createSignal<number | null>(null);
  const [pelapor, setPelapor] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');
  const [editPelanggaranId, setEditPelanggaranId] = createSignal<number | null>(null);

  // Hapus Pelanggaran State
  const [deleteTarget, setDeleteTarget] = createSignal<IPelanggaran | null>(null);
  const [deleting, setDeleting] = createSignal(false);
  const canDelete = () => auth.hasRole(['admin', 'prodi', 'super_admin']);

  const confirmDelete = async () => {
    const target = deleteTarget();
    if (!target) return;
    setDeleting(true);
    try {
      await bimbinganController.deletePelanggaran(target.id);
      toast.showToast('Catatan pelanggaran berhasil dihapus', 'success');
      setDeleteTarget(null);
      refetchAllViolations();
      refetchStudentViolations();
      refetchRekap();
      refetchMahasiswaTxly();
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal menghapus data pelanggaran', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Preview / Cetak SP State
  const [selectedSpItem, setSelectedSpItem] = createSignal<IPelanggaran | null>(null);
  const [showSpModal, setShowSpModal] = createSignal(false);

  const openSpModal = (item: IPelanggaran) => {
    setSelectedSpItem(item);
    setShowSpModal(true);
  };

  const openSpPrint = (item: IPelanggaran) => {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const isTertulis = item.jenisSanksi === 4;
    const tanggal = new Date(item.tanggal).toLocaleDateString('id-ID', { dateStyle: 'full' });

    // Kop surat global (HTML string) — baris kementerian dipertahankan pada judul.
    const kg = kop() ?? KOPI_FALLBACK;
    const kopBlock = `${kg.tampilkanLogo && kopLogoSrc() ? `<img src="${kopLogoSrc()}" alt="" style="height:64px;float:left;margin:0 16px 8px 0;object-fit:contain" />` : ''}
<p style="text-align:center;margin:0;font-size:16px;font-weight:bold">${escapeHtml(kg.nama)}</p>
${kg.alamat.map((a) => `<p style="text-align:center;margin:0;font-size:12px">${escapeHtml(a)}</p>`).join('\n')}
${kg.kontak ? `<p style="text-align:center;margin:0;font-size:12px">${escapeHtml(kg.kontak)}</p>` : ''}
${kg.website ? `<p style="text-align:center;margin:0;font-size:12px"><a href="${escapeHtml(kg.website)}">${escapeHtml(kg.website)}</a></p>` : ''}
${kg.email ? `<p style="text-align:center;margin:0;font-size:12px">Email: <a href="mailto:${escapeHtml(kg.email)}">${escapeHtml(kg.email)}</a></p>` : ''}
<div style="clear:both;border-bottom:2px solid #000;margin:8px 0 14px"></div>`;

    const namaMahasiswa = escapeHtml(item.namaMahasiswa || '-');
    const nim = escapeHtml(item.nim || '-');
    const prodiNama = escapeHtml(item.prodiNama || '-');
    const jenisPelanggaran = escapeHtml(item.jenisPelanggaran);
    const pelapor = escapeHtml(item.pelapor || 'Petugas Kedisiplinan');
    const keterangan = escapeHtml(item.keterangan);
    const pasal = item.nomorPasal ? `${escapeHtml(item.nomorPasal)} - ${escapeHtml(item.bunyiPasal || '')}` : '';

    const body = `
 <div id="printable-sp" class="sp-doc">
 ${kopBlock}
 <div class="judul">
 <p style="margin:0 0 4px;font-size:13px;letter-spacing:1px">KEMENTERIAN PENDIDIKAN TINGGI, RISET, DAN TEKNOLOGI</p>
 <h4>SURAT PERINGATAN KEDISIPLINAN ${isTertulis ? 'TERTULIS (SP TERTULIS)' : 'LISAN (SP LISAN)'}</h4>
 <p>Berdasarkan Buku Pedoman Akademik (BPA) Pasal 25, 26, & 28</p>
 </div>
 <div class="identitas">
 <div class="row"><span>Nama Mahasiswa</span><span>: ${namaMahasiswa}</span></div>
 <div class="row"><span>NIM</span><span>: ${nim}</span></div>
 <div class="row"><span>Program Studi</span><span>: ${prodiNama}</span></div>
 </div>
 <p class="isi">
 Dengan ini diberikan peringatan indisipliner kepada mahasiswa bersangkutan atas pelanggaran yang terjadi pada:
 </p>
 <div class="rincian">
 <div class="row"><span>Tanggal Kejadian</span><span>: ${tanggal}</span></div>
 ${pasal ? `<div class="row"><span>Pasal BPA</span><span>: ${pasal}</span></div>` : ''}
 <div class="row"><span>Jenis Pelanggaran</span><span>: ${jenisPelanggaran}</span></div>
 <div class="row">
 <span>Tingkat Sanksi</span>
 <span>: ${
   isTertulis
     ? 'Peringatan Tertulis (Degradasi Nilai Mutu Sikap -1.00)'
     : 'Peringatan Lisan (Degradasi Nilai Mutu Sikap -0.25)'
}</span>
 </div>
 <div class="row"><span>Dilaporkan Oleh</span><span>: ${pelapor}</span></div>
 <div class="row"><span>Keterangan / Kronologi</span><span>:"${keterangan}"</span></div>
 </div>
 <p class="catatan">
 Mahasiswa diharapkan mematuhi Buku Pedoman Akademik Politeknik Sorowako. Apabila melakukan pelanggaran
 berulang, akan dikenakan sanksi peringatan tingkat berikutnya hingga pemberhentian (Drop Out).
 </p>
 <div class="ttd">
 <div>
 <span>Mahasiswa Bersangkutan,</span>
 <div>
 <p class="tanda">${item.namaMahasiswa ? escapeHtml(item.namaMahasiswa) : '....................'}</p>
 <p>NIM. ${item.nim ? escapeHtml(item.nim) : '...............'}</p>
 </div>
 </div>
 <div>
 <span>Mengetahui,<br />Dosen Pembimbing Akademik</span>
 <div>
 <p class="tanda">_________________________</p>
 <p>NIP/NIDN Dosen PA</p>
 </div>
 </div>
 <div>
 <span>Menyetujui,<br />Ketua Program Studi</span>
 <div>
 <p class="tanda">_________________________</p>
 <p>Ketua Program Studi</p>
 </div>
 </div>
 </div>
 </div>`;

    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) {
      toast.showToast('Popup diblokir. Aktifkan popup untuk mencetak.', 'error');
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Surat Peringatan - ${escapeHtml(item.namaMahasiswa || '')}</title>
<style>
 @page { size: A4; margin: 18mm; }
 * { box-sizing: border-box; margin: 0; padding: 0; }
 body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; line-height: 1.5; }
 .sp-doc { max-width: 680px; margin: 0 auto; }
 .kop { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 16px; }
 .kop h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
 .kop h3 { font-size: 18px; font-weight: 900; text-transform: uppercase; color: #14532d; }
 .kop p { font-size: 10px; color: #555; }
 .judul { text-align: center; margin: 12px 0; }
 .judul h4 { font-size: 14px; font-weight: 800; text-decoration: underline; text-transform: uppercase; }
 .judul p { font-size: 11px; color: #555; }
 .identitas { margin: 12px 0; padding: 10px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; }
 .row { display: grid; grid-template-columns: 200px 1fr; gap: 8px; padding: 2px 0; }
 .row > span:first-child { font-weight: 600; color: #555; }
 .isi { margin: 10px 0; line-height: 1.6; }
 .rincian { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; }
 .catatan { font-size: 11px; color: #555; line-height: 1.6; margin: 10px 0; }
 .ttd { margin-top: 28px; padding-top: 14px; border-top: 1px dashed #999; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; font-size: 12px; }
 .ttd > div { display: flex; flex-direction: column; justify-content: space-between; height: 110px; }
 .tanda { font-weight: 700; text-decoration: underline; }
 .ttd p { font-size: 10px; }
 @media print { .no-print { display: none; } }
</style>
</head>
<body>
 ${body}
 <div class="no-print" style="margin-top:24px; text-align:center;">
 <button onclick="window.print()" style="padding:10px 20px; font-size:14px;">Cetak Dokumen SP</button>
 </div>
 <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`);
    win.document.close();
  };

  const selectedPasal = () => pasalList()?.find((p) => p.id === pasalId()) || null;

  const openAddModal = () => {
    setEditPelanggaranId(null);
    const firstStudent = mahasiswaList()?.[0]?.id || 0;
    setMahasiswaId(firstStudent);
    setTanggal(getTodayString());
    setJenisPelanggaran('');
    setKeterangan('');
    setPasalId(null);
    setPelapor(user()?.nama || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handlePasalChange = (val: string | number) => {
    const id = val ? Number(val) : null;
    const cleanId = id && id > 0 ? id : null;
    setPasalId(cleanId);
    if (cleanId) {
      const pasal = pasalList()?.find((p) => p.id === cleanId);
      if (pasal) {
        setJenisPelanggaran(`${pasal.nomorPasal} - ${pasal.bunyiPasal}`.slice(0, 255));
      }
    } else {
      // Pasal dibatalkan -> bersihkan teks hasil auto-fill agar tidak tersimpan data basi.
      setJenisPelanggaran('');
    }
  };

  const openEditModal = (item: IPelanggaran) => {
    setEditPelanggaranId(item.id);
    setMahasiswaId(item.mahasiswaId);
    ensureStudentLoaded(item.mahasiswaId);
    setTanggal(item.tanggal);
    setJenisPelanggaran(item.jenisPelanggaran);
    setKeterangan(item.keterangan);
    setPasalId(item.pasalId && item.pasalId > 0 ? item.pasalId : null);
    setPelapor(item.pelapor || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!mahasiswaId() || !tanggal() || !keterangan()) {
      setErrorMsg('Mahasiswa, tanggal, dan keterangan wajib diisi.');
      return;
    }
    if (!jenisPelanggaran().trim()) {
      setErrorMsg('Jenis pelanggaran wajib diisi. Pilih pasal BPA atau tulis jenis pelanggaran secara manual.');
      return;
    }

    try {
      const payload = {
        mahasiswaId: mahasiswaId(),
        tanggal: tanggal(),
        jenisPelanggaran: jenisPelanggaran(),
        keterangan: keterangan(),
        pasalId: pasalId() && pasalId()! > 0 ? pasalId() : null,
        pelapor: pelapor().trim() || undefined,
      };

      const activeId = editPelanggaranId();
      if (activeId) {
        await bimbinganController.updatePelanggaran(activeId, payload);
      } else {
        await bimbinganController.createPelanggaran(payload);
      }
      setShowModal(false);
      refetchAllViolations();
      refetchRekap();
      refetchMahasiswaTxly();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Gagal menyimpan data.');
    }
  };

  // Rekap state & Tab Mahasiswa TXLY state
  const [viewTab, setViewTab] = createSignal<'daftar' | 'rekap' | 'mahasiswa'>('daftar');
  const [rekapProdi, setRekapProdi] = createSignal<number | undefined>(undefined);
  const [rekap, { refetch: refetchRekap }] = createResource(
    () => ({ prodi: rekapProdi() }),
    async ({ prodi }) => {
      if (!isStaff()) return null;
      return await bimbinganController.getRekapPelanggaran(prodi);
    },
  );

  // Tab 3: Mahasiswa TXLY State & Filters
  const [mhsTxlySearch, setMhsTxlySearch] = createSignal('');
  const [mhsTxlyProdi, setMhsTxlyProdi] = createSignal<number | undefined>(undefined);
  const [mhsTxlyPredikat, setMhsTxlyPredikat] = createSignal<string | undefined>(undefined);
  type MhsTxlySortField = 'predikat' | 'nama' | 'nim' | 'prodiNama' | 'semester' | 'jumlahPelanggaran';
  const [mhsTxlySortField, setMhsTxlySortField] = createSignal<MhsTxlySortField>('predikat');
  const [mhsTxlySortDir, setMhsTxlySortDir] = createSignal<'asc' | 'desc'>('desc');
  const mhsTxlySortAria = (field: MhsTxlySortField): 'ascending' | 'descending' | 'none' =>
    mhsTxlySortField() === field ? (mhsTxlySortDir() === 'asc' ? 'ascending' : 'descending') : 'none';

  // Input pencarian dibuat uncontrolled (tanpa binding `value`) agar Solid
  // tidak pernah menyentuh DOM input — kursor/fokus tidak mungkin terganggu.
  // Nilai dibaca via onInput + dikosongkan lewat ref saat Reset Filter.
  let mhsTxlySearchEl: HTMLInputElement | undefined;

  // Pola tab Daftar: ambil daftar penuh SEKALI per buka tab; filter
  // (cari/prodi/predikat) berjalan sepenuhnya di memori sehingga mengetik
  // tidak menyentuh network sama sekali. Kembali ke tab = refetch (segar).
  const [mahasiswaTxlyList, { refetch: refetchMahasiswaTxly }] = createResource(
    () => (isStaff() && viewTab() === 'mahasiswa' ? true : null),
    async () => {
      return await bimbinganController.getMahasiswaPredikat({});
    },
  );

  const visibleMahasiswaTxly = createMemo(() => {
    const list = mahasiswaTxlyList() || [];
    const q = mhsTxlySearch().trim().toLowerCase();
    const pid = mhsTxlyProdi();
    const pred = mhsTxlyPredikat()?.trim().toUpperCase();

    let rows = list;
    if (pid) {
      rows = rows.filter((m) => m.programStudiId === pid);
    }
    if (pred) {
      rows = rows.filter((m) => {
        const full = `T${Math.floor(m.totalPoin / 4)}L${m.totalPoin % 4}`;
        return m.predikat.toUpperCase() === pred || full === pred;
      });
    }
    if (q) {
      rows = rows.filter((m) => m.nama.toLowerCase().includes(q) || m.nim.toLowerCase().includes(q));
    }

    const field = mhsTxlySortField();
    const dir = mhsTxlySortDir() === 'asc' ? 1 : -1;

    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (field === 'predikat') {
        // Urutkan berdasarkan total poin / akumulasi sanksi tertinggi
        cmp = a.totalPoin - b.totalPoin;
      } else if (field === 'jumlahPelanggaran') {
        cmp = a.jumlahPelanggaran - b.jumlahPelanggaran;
      } else if (field === 'semester') {
        cmp = (a.semester || 0) - (b.semester || 0);
      } else {
        const av = String(a[field] || '');
        const bv = String(b[field] || '');
        cmp = av.localeCompare(bv, 'id', { sensitivity: 'base' });
      }
      return cmp * dir;
    });
  });

  const toggleMhsTxlySort = (field: MhsTxlySortField) => {
    if (mhsTxlySortField() === field) {
      setMhsTxlySortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setMhsTxlySortField(field);
      setMhsTxlySortDir(field === 'predikat' ? 'desc' : 'asc');
    }
  };

  // Modal Riwayat Mahasiswa (klik item dari tab mahasiswa TXLY)
  const [selectedMhsDetail, setSelectedMhsDetail] = createSignal<MahasiswaTxlyItem | null>(null);
  const [mhsViolationsDetail, { refetch: refetchMhsViolationsDetail }] = createResource(
    () => selectedMhsDetail()?.mahasiswaId,
    async (mhsId) => {
      if (!mhsId) return null;
      return await bimbinganController.getPelanggaranByMhsId(mhsId);
    },
  );

  const openMahasiswaDetail = (item: MahasiswaTxlyItem) => {
    setSelectedMhsDetail(item);
    modalRiwayatPagination.resetPage();
  };

  // 1. Pagination untuk Tab Mahasiswa TXLY
  const mhsTxlyPagination = usePagination(10);
  const totalMhsTxlyPages = createMemo(() => Math.ceil(visibleMahasiswaTxly().length / mhsTxlyPagination.limit()) || 1);
  const paginatedMhsTxly = createMemo(() => {
    const start = (mhsTxlyPagination.page() - 1) * mhsTxlyPagination.limit();
    return visibleMahasiswaTxly().slice(start, start + mhsTxlyPagination.limit());
  });

  // Auto reset page saat filter Mahasiswa TXLY berubah
  createEffect(() => {
    mhsTxlySearch();
    mhsTxlyProdi();
    mhsTxlyPredikat();
    mhsTxlySortField();
    mhsTxlySortDir();
    mhsTxlyPagination.resetPage();
  });

  // 2. Pagination untuk Tab Rekap - Pelanggar Terbanyak
  const rekapTopPagination = usePagination(10);
  const totalRekapTopPages = createMemo(
    () => Math.ceil((rekap()?.topPelanggar?.length || 0) / rekapTopPagination.limit()) || 1,
  );
  const paginatedRekapTop = createMemo(() => {
    const list = rekap()?.topPelanggar || [];
    const start = (rekapTopPagination.page() - 1) * rekapTopPagination.limit();
    return list.slice(start, start + rekapTopPagination.limit());
  });

  // 3. Pagination untuk Tab Rekap - Per Jenis Pelanggaran
  const rekapJenisPagination = usePagination(10);
  const totalRekapJenisPages = createMemo(
    () => Math.ceil((rekap()?.perJenis?.length || 0) / rekapJenisPagination.limit()) || 1,
  );
  const paginatedRekapJenis = createMemo(() => {
    const list = rekap()?.perJenis || [];
    const start = (rekapJenisPagination.page() - 1) * rekapJenisPagination.limit();
    return list.slice(start, start + rekapJenisPagination.limit());
  });

  // Auto reset halaman tabel rekap saat program studi berubah
  createEffect(() => {
    rekapProdi();
    rekapTopPagination.resetPage();
    rekapJenisPagination.resetPage();
  });

  // 4. Pagination untuk Modal Riwayat Mahasiswa
  const modalRiwayatPagination = usePagination(5);
  const modalRiwayatList = createMemo(() => mhsViolationsDetail()?.pelanggaranList || []);
  const totalModalRiwayatPages = createMemo(
    () => Math.ceil(modalRiwayatList().length / modalRiwayatPagination.limit()) || 1,
  );
  const paginatedModalRiwayat = createMemo(() => {
    const start = (modalRiwayatPagination.page() - 1) * modalRiwayatPagination.limit();
    return modalRiwayatList().slice(start, start + modalRiwayatPagination.limit());
  });

  // 5. Pagination untuk Mahasiswa View (Riwayat Pribadi)
  const studentPagination = usePagination(10);
  const studentViolationsList = createMemo(() => studentViolations()?.pelanggaranList || []);
  const totalStudentPages = createMemo(
    () => Math.ceil(studentViolationsList().length / studentPagination.limit()) || 1,
  );
  const paginatedStudentViolations = createMemo(() => {
    const start = (studentPagination.page() - 1) * studentPagination.limit();
    return studentViolationsList().slice(start, start + studentPagination.limit());
  });

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header Section */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-secondary-100 dark:bg-secondary-900 dark:border-secondary-800">
          <div>
            <h1 class="page-title">Kedisiplinan Mahasiswa</h1>
            <p class="text-base text-secondary-500 dark:text-secondary-300">
              Pencatatan pelanggaran indisipliner dan rekap poin kedisiplinan
            </p>
          </div>
          <Show when={isStaff()}>
            <div class="flex items-center gap-2 sm:gap-3">
              <Show when={auth.hasRole(['admin', 'prodi', 'super_admin'])}>
                <a
                  href="/pelanggaran/pasal-bpa"
                  title="Kelola Pasal BPA"
                  aria-label="Kelola Pasal BPA"
                  class="inline-flex items-center justify-center gap-2 h-11 px-3 sm:px-5 bg-white border border-secondary-200 hover:bg-secondary-50 text-secondary-700 font-bold rounded-full text-base transition-all active:scale-95 dark:bg-secondary-900 dark:border-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-800"
                >
                  <svg
                    class="w-5 h-5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                  </svg>
                  <span class="hidden sm:inline">Kelola Pasal BPA</span>
                </a>
              </Show>
              <IconActionButton
                label="Impor CSV"
                variant="gray"
                onClick={() => setShowImportModal(true)}
                icon={
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 15V3m0 0-4 4m4-4 4 4M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"
                    />
                  </svg>
                }
              />
              <IconActionButton
                label="Catat Pelanggaran"
                variant="blue"
                onClick={openAddModal}
                icon={
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
                  </svg>
                }
              />
            </div>
          </Show>
        </div>

        {/* Staff tab switcher */}
        <Show when={isStaff()}>
          <div class="flex gap-2">
            <button
              onClick={() => setViewTab('daftar')}
              class={`px-4 py-2 rounded-xl text-base font-bold transition-all ${
                viewTab() === 'daftar'
                  ? 'bg-action text-white'
                  : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50 dark:bg-secondary-900 dark:text-secondary-300 dark:border-secondary-800'
              }`}
            >
              Daftar Pelanggaran
            </button>
            <button
              onClick={() => setViewTab('rekap')}
              class={`px-4 py-2 rounded-xl text-base font-bold transition-all ${
                viewTab() === 'rekap'
                  ? 'bg-action text-white'
                  : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50 dark:bg-secondary-900 dark:text-secondary-300 dark:border-secondary-800'
              }`}
            >
              Rekap & Predikat TXLY
            </button>
            <button
              onClick={() => setViewTab('mahasiswa')}
              class={`px-4 py-2 rounded-xl text-base font-bold transition-all ${
                viewTab() === 'mahasiswa'
                  ? 'bg-action text-white'
                  : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50 dark:bg-secondary-900 dark:text-secondary-300 dark:border-secondary-800'
              }`}
            >
              Daftar Mahasiswa TXLY
            </button>
          </div>
        </Show>

        {/* Student View */}
        <Show when={auth.hasRole(['mahasiswa'])}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary Widget */}
            <div class="bg-white border border-secondary-100 rounded-2xl p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
              <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">Status Kedisiplinan</h3>
              <div class="flex flex-col gap-2 items-center justify-center py-6">
                <span
                  class={`text-6xl font-bold ${
                    (studentViolations()?.totalPoin || 0) >= 25 ? 'text-rose-600 animate-pulse' : 'text-action'
                  }`}
                >
                  {studentViolations.loading ? '...' : studentViolations()?.totalPoin || 0}
                </span>
                <span class="text-caption font-semibold uppercase tracking-wider text-secondary-400 dark:text-secondary-300">
                  Total Poin Pelanggaran
                </span>
                <Show when={studentViolations()?.predikat}>
                  <div class="flex flex-col items-center gap-1 mt-1">
                    <span class="px-3 py-1 rounded-lg bg-action-50 text-action border border-brand-100 font-bold text-base dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800">
                      Predikat: {studentViolations()?.predikat}
                    </span>
                    <span class="text-fine font-semibold text-rose-600 dark:text-rose-400">
                      Degradasi Mutu Sikap: -{studentViolations()?.degradasiNilaiSikap ?? 0}
                    </span>
                  </div>
                </Show>
              </div>
              <div class="p-3.5 bg-secondary-50 border border-secondary-100 rounded-xl dark:bg-secondary-800 dark:border-secondary-800">
                <p class="text-fine text-secondary-400 dark:text-secondary-300 leading-relaxed uppercase tracking-wider font-semibold">
                  Batas Poin Kelayakan (BPA):
                </p>
                <ul class="text-fine text-secondary-500 dark:text-secondary-300 list-disc pl-4 mt-1 flex flex-col gap-0.5 font-medium">
                  <li>Total poin &gt;= 25: Peringatan Keras (SP-1)</li>
                  <li>Total poin &gt;= 50: Skorsing Akademik (SP-2)</li>
                  <li>Total poin &gt;= 75: Drop Out / Diberhentikan (SP-3)</li>
                </ul>
              </div>
            </div>

            {/* Violation List */}
            <div class="lg:col-span-2 bg-white border border-secondary-100 rounded-2xl overflow-hidden p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
              <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">Riwayat Tindakan Indisipliner</h3>
              <Show
                when={studentViolations()?.pelanggaranList && studentViolations()!.pelanggaranList.length > 0}
                fallback={
                  <div class="py-12 text-center text-secondary-400 dark:text-secondary-300 text-base">
                    🎉 Luar biasa! Anda tidak memiliki catatan pelanggaran indisipliner semester ini.
                  </div>
                }
              >
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-caption border-collapse">
                    <thead>
                      <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                        <th class="p-3">Tanggal</th>
                        <th class="p-3">Pasal</th>
                        <th class="p-3">Jenis Pelanggaran</th>
                        <th class="p-3">Pelapor</th>
                        <th class="p-3">Sanksi</th>
                        <th class="p-3">Keterangan</th>
                        <th class="p-3 text-center">Dokumen</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                      <For each={paginatedStudentViolations()}>
                        {(item) => (
                          <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                            <td class="p-3 whitespace-nowrap">{new Date(item.tanggal).toLocaleDateString()}</td>
                            <td class="p-3">
                              <Show
                                when={item.nomorPasal}
                                fallback={<span class="text-secondary-400 dark:text-secondary-300">-</span>}
                              >
                                <span class="font-bold text-secondary-800 dark:text-white">{item.nomorPasal}</span>
                                <Show when={item.bunyiPasal}>
                                  <div class="text-fine text-secondary-500 dark:text-secondary-300 max-w-[200px] truncate">
                                    {item.bunyiPasal}
                                  </div>
                                </Show>
                              </Show>
                            </td>
                            <td class="p-3">{item.jenisPelanggaran}</td>
                            <td class="p-3 whitespace-nowrap">
                              <span class="text-secondary-600 dark:text-secondary-300 font-medium">
                                {item.pelapor || '-'}
                              </span>
                            </td>
                            <td class="p-3">
                              <span
                                class={`px-2 py-0.5 rounded border font-bold ${
                                  item.jenisSanksi === 4
                                    ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                }`}
                              >
                                {item.jenisSanksi === 4 ? 'Tertulis (-1.00)' : 'Lisan (-0.25)'}
                              </span>
                            </td>
                            <td class="p-3">{item.keterangan}</td>
                            <td class="p-3 text-center">
                              <Button
                                onClick={() => openSpModal(item)}
                                variant="secondary"
                                class="py-1 px-2.5 text-fine"
                              >
                                Preview SP
                              </Button>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={studentPagination.page()}
                  totalPages={totalStudentPages()}
                  total={studentViolationsList().length}
                  limit={studentPagination.limit()}
                  pageOptions={pageOptions}
                  onPageChange={studentPagination.setPage}
                  onLimitChange={studentPagination.setLimit}
                />
              </Show>
            </div>
          </div>
        </Show>

        {/* Staff View (Admin/Dosen/Prodi/Instruktur) */}
        <Show when={isStaff() && viewTab() === 'daftar'}>
          <div class="bg-white border border-secondary-100 rounded-2xl p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-3">
              <div>
                <h3 class="font-bold text-secondary-800 dark:text-white">Daftar Pelanggaran Mahasiswa</h3>
                <p class="text-caption text-secondary-500 dark:text-secondary-300">
                  Riwayat seluruh catatan tindakan indisipliner yang dapat difilter dan diekspor
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handleExportExcel}
                  title="Ekspor daftar pelanggaran ke file Excel (.xlsx)"
                  aria-label="Ekspor Excel"
                  class="flex items-center gap-1.5 py-1.5 text-caption font-semibold"
                >
                  <span aria-hidden="true">📊</span> <span class="hidden sm:inline">Ekspor Excel</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportPDF}
                  title="Ekspor daftar pelanggaran ke dokumen PDF (.pdf)"
                  aria-label="Ekspor PDF"
                  class="flex items-center gap-1.5 py-1.5 text-caption font-semibold"
                >
                  <span aria-hidden="true">📄</span> <span class="hidden sm:inline">Ekspor PDF</span>
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-secondary-50/70 rounded-xl border border-secondary-100 dark:bg-secondary-800/50 dark:border-secondary-800">
              <div class="flex flex-col gap-1 lg:col-span-1">
                <label class="text-fine font-bold text-secondary-500 dark:text-secondary-300 uppercase">
                  Pencarian
                </label>
                <Input
                  type="text"
                  placeholder="Cari nama, NIM, keterangan..."
                  value={violationSearch()}
                  onInput={(e) => {
                    setViolationSearch(e.currentTarget.value);
                    resetPage();
                  }}
                  class="w-full text-caption"
                />
              </div>

              <div class="flex flex-col gap-1 lg:col-span-1">
                <label class="text-fine font-bold text-secondary-500 dark:text-secondary-300 uppercase">
                  Program Studi
                </label>
                <SearchableSelect
                  placeholder="Semua Prodi..."
                  value={filterProdiId() ?? ''}
                  options={[
                    { label: 'Semua Program Studi', value: '' },
                    ...(prodiList() || []).map((p) => ({
                      label: `${p.nama} (${p.jenjang})`,
                      value: p.id,
                    })),
                  ]}
                  onChange={(val) => {
                    setFilterProdiId(val ? Number(val) : undefined);
                    resetPage();
                  }}
                />
              </div>

              <div class="flex flex-col gap-1 lg:col-span-1">
                <label class="text-fine font-bold text-secondary-500 dark:text-secondary-300 uppercase">
                  Periode Semester
                </label>
                <SearchableSelect
                  placeholder="Semua Periode..."
                  value={filterPeriodeId() ?? ''}
                  options={[
                    { label: 'Semua Periode Semester', value: '' },
                    ...(periodeList() || []).map((per) => ({
                      label: `${per.nama} (${per.id})`,
                      value: per.id,
                    })),
                  ]}
                  onChange={(val) => {
                    setFilterPeriodeId(val ? String(val) : undefined);
                    resetPage();
                  }}
                />
              </div>

              <div class="flex flex-col gap-1 lg:col-span-1">
                <label class="text-fine font-bold text-secondary-500 dark:text-secondary-300 uppercase">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={filterStartDate()}
                  onInput={(e) => {
                    setFilterStartDate(e.currentTarget.value);
                    resetPage();
                  }}
                  class="w-full border border-secondary-200 rounded-lg px-3 py-1.5 text-caption focus:outline-none focus:border-action dark:border-secondary-700 dark:bg-secondary-800 dark:text-white"
                />
              </div>

              <div class="flex flex-col gap-1 lg:col-span-1">
                <label class="text-fine font-bold text-secondary-500 dark:text-secondary-300 uppercase">
                  Sampai Tanggal
                </label>
                <div class="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={filterEndDate()}
                    onInput={(e) => {
                      setFilterEndDate(e.currentTarget.value);
                      resetPage();
                    }}
                    class="w-full border border-secondary-200 rounded-lg px-3 py-1.5 text-caption focus:outline-none focus:border-action dark:border-secondary-700 dark:bg-secondary-800 dark:text-white"
                  />
                  <Show
                    when={
                      filterProdiId() || filterPeriodeId() || filterStartDate() || filterEndDate() || violationSearch()
                    }
                  >
                    <button
                      onClick={() => {
                        setViolationSearch('');
                        setFilterProdiId(undefined);
                        setFilterPeriodeId(undefined);
                        setFilterStartDate('');
                        setFilterEndDate('');
                        resetPage();
                      }}
                      class="px-2 py-1.5 text-fine text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 font-semibold whitespace-nowrap transition-all dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      title="Reset semua filter"
                    >
                      Reset
                    </button>
                  </Show>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between text-caption text-secondary-400 dark:text-secondary-300">
              <span>
                Menampilkan {visibleViolations().length} dari {allViolations()?.length || 0} catatan
              </span>
            </div>
            <Show
              when={allViolations() && allViolations()!.length > 0}
              fallback={
                <div class="py-12 text-center text-secondary-400 dark:text-secondary-300 text-base">
                  Belum ada catatan tindakan indisipliner terdaftar.
                </div>
              }
            >
              <Show
                when={visibleViolations().length > 0}
                fallback={
                  <div class="py-12 text-center text-secondary-400 dark:text-secondary-300 text-base">
                    Tidak ada catatan yang cocok dengan pencarian.
                  </div>
                }
              >
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-caption border-collapse">
                    <thead>
                      <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                        <th
                          class="p-3 cursor-pointer select-none hover:text-action"
                          onClick={() => toggleSort('namaMahasiswa')}
                        >
                          Mahasiswa {sortField() === 'namaMahasiswa' ? (sortDir() === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th class="p-3 cursor-pointer select-none hover:text-action" onClick={() => toggleSort('nim')}>
                          NIM {sortField() === 'nim' ? (sortDir() === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th
                          class="p-3 cursor-pointer select-none hover:text-action"
                          onClick={() => toggleSort('prodiNama')}
                        >
                          Program Studi {sortField() === 'prodiNama' ? (sortDir() === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th
                          class="p-3 cursor-pointer select-none hover:text-action"
                          onClick={() => toggleSort('tanggal')}
                        >
                          Tanggal {sortField() === 'tanggal' ? (sortDir() === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th class="p-3">Pasal</th>
                        <th
                          class="p-3 cursor-pointer select-none hover:text-action"
                          onClick={() => toggleSort('pelapor')}
                        >
                          Pelapor {sortField() === 'pelapor' ? (sortDir() === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th
                          class="p-3 cursor-pointer select-none hover:text-action"
                          onClick={() => toggleSort('jenisSanksi')}
                        >
                          Sanksi {sortField() === 'jenisSanksi' ? (sortDir() === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th class="p-3">Keterangan</th>
                        <th class="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                      <For each={paginatedViolations()}>
                        {(item) => (
                          <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                            <td class="p-3 font-bold text-secondary-800 dark:text-white">
                              <div class="flex items-center gap-2">
                                <StudentAvatar
                                  foto={item.foto}
                                  nama={item.namaMahasiswa || '-'}
                                  nim={item.nim}
                                  size="sm"
                                />
                                {item.namaMahasiswa}
                              </div>
                            </td>
                            <td class="p-3 whitespace-nowrap">{item.nim}</td>
                            <td class="p-3">{item.prodiNama}</td>
                            <td class="p-3 whitespace-nowrap">{new Date(item.tanggal).toLocaleDateString()}</td>
                            <td class="p-3">
                              <Show
                                when={item.nomorPasal}
                                fallback={<span class="text-secondary-400 dark:text-secondary-300">-</span>}
                              >
                                <span class="font-bold text-secondary-800 dark:text-white">{item.nomorPasal}</span>
                                <Show when={item.bunyiPasal}>
                                  <div class="text-fine text-secondary-500 dark:text-secondary-300 max-w-[220px] truncate">
                                    {item.bunyiPasal}
                                  </div>
                                </Show>
                              </Show>
                            </td>
                            <td class="p-3 whitespace-nowrap">
                              <span class="text-secondary-600 dark:text-secondary-300 font-semibold">
                                {item.pelapor || '-'}
                              </span>
                            </td>
                            <td class="p-3">
                              <span
                                class={`px-2 py-0.5 rounded border font-bold ${
                                  item.jenisSanksi === 4
                                    ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                }`}
                              >
                                {item.jenisSanksi === 4 ? 'Tertulis (-1.00)' : 'Lisan (-0.25)'}
                              </span>
                            </td>
                            <td class="p-3 max-w-[200px] truncate">{item.keterangan}</td>
                            <td class="p-3 text-center">
                              <div class="flex items-center justify-center gap-1.5">
                                <Button
                                  onClick={() => openSpPrint(item)}
                                  variant="secondary"
                                  class="py-1 px-2 text-fine"
                                  title="Cetak Dokumen SP di jendela baru"
                                  aria-label="Cetak SP"
                                >
                                  <span aria-hidden="true">🖨️</span> <span class="hidden sm:inline">Cetak SP</span>
                                </Button>
                                <Show when={auth.hasRole(['admin'])}>
                                  <Button
                                    onClick={() => openEditModal(item)}
                                    variant="secondary"
                                    class="py-1 px-2 text-fine"
                                    title="Edit catatan pelanggaran"
                                    aria-label="Edit"
                                  >
                                    <span aria-hidden="true">✏️</span> <span class="hidden sm:inline">Edit</span>
                                  </Button>
                                </Show>
                                <Show when={canDelete()}>
                                  <button
                                    onClick={() => setDeleteTarget(item)}
                                    class="py-1 px-2 text-fine font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all active:scale-95 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                    title="Hapus catatan pelanggaran"
                                    aria-label="Hapus"
                                  >
                                    <span aria-hidden="true">🗑️</span> <span class="hidden sm:inline">Hapus</span>
                                  </button>
                                </Show>
                              </div>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={page()}
                  totalPages={totalPages()}
                  total={visibleViolations().length}
                  limit={limit()}
                  pageOptions={pageOptions}
                  onPageChange={setPage}
                  onLimitChange={handleLimitChange}
                />
              </Show>
            </Show>
          </div>
        </Show>

        {/* Rekap View (Staff) */}
        <Show when={isStaff() && viewTab() === 'rekap'}>
          <div class="bg-white border border-secondary-100 rounded-2xl p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">
                  Rekap Pelanggaran & Predikat TXLY
                </h3>
                <p class="text-caption text-secondary-500 dark:text-secondary-300 mt-1">
                  Predikat TXLY: X = sanksi tertulis (pengurangan nilai mutu -1,00), Y = sanksi lisan (pengurangan nilai
                  mutu -0,25).
                </p>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex flex-col gap-1 w-64">
                  <label class="text-fine font-bold text-secondary-500 dark:text-secondary-300 uppercase">
                    Program Studi
                  </label>
                  <SearchableSelect
                    placeholder="Semua Program Studi..."
                    value={rekapProdi() ?? ''}
                    options={[
                      { label: 'Semua Program Studi', value: '' },
                      ...(prodiList() || []).map((p) => ({
                        label: `${p.nama} (${p.jenjang})`,
                        value: p.id,
                      })),
                    ]}
                    onChange={(val) => {
                      setRekapProdi(val ? Number(val) : undefined);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Summary stats */}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="p-4 bg-secondary-50 rounded-xl border border-secondary-100 dark:bg-secondary-800 dark:border-secondary-800">
                <div class="text-2xl font-bold text-secondary-800 dark:text-white">
                  {rekap()?.totalPelanggaran || 0}
                </div>
                <div class="text-fine uppercase font-semibold text-secondary-400 dark:text-secondary-300">
                  Total Pelanggaran
                </div>
              </div>
              <div class="p-4 bg-secondary-50 rounded-xl border border-secondary-100 dark:bg-secondary-800 dark:border-secondary-800">
                <div class="text-2xl font-bold text-secondary-800 dark:text-white">{rekap()?.totalMahasiswa || 0}</div>
                <div class="text-fine uppercase font-semibold text-secondary-400 dark:text-secondary-300">
                  Mahasiswa
                </div>
              </div>
              <div class="p-4 bg-action-50 rounded-xl border border-action-100 dark:bg-secondary-800 dark:border-secondary-800">
                <div class="text-2xl font-bold text-action dark:text-action dark:text-action-ondark">
                  {rekap()?.perProdi.reduce((a, p) => a + p.totalPoin, 0) || 0}
                </div>
                <div class="text-fine uppercase font-semibold text-secondary-400 dark:text-secondary-300">
                  Total Poin
                </div>
              </div>
              <div class="p-4 bg-action-50 rounded-xl border border-brand-100 dark:bg-secondary-800 dark:border-secondary-800">
                <div class="text-2xl font-bold text-action dark:text-brand-400">
                  {rekap()?.topPelanggar.length || 0}
                </div>
                <div class="text-fine uppercase font-semibold text-secondary-400 dark:text-secondary-300">
                  Total Pelanggar
                </div>
              </div>
            </div>

            {/* Top pelanggar table with predikat */}
            <div>
              <div class="flex items-center justify-between border-b pb-2 mb-2">
                <h4 class="text-base font-bold text-secondary-700 dark:text-secondary-200">
                  {rekapProdi()
                    ? `Daftar Pelanggar - ${prodiList()?.find((p) => p.id === rekapProdi())?.nama || 'Program Studi Terpilih'}`
                    : 'Pelanggar Terbanyak (Seluruh Program Studi)'}
                </h4>
                <span class="text-fine text-secondary-400">{rekap()?.topPelanggar?.length || 0} mahasiswa</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-caption border-collapse">
                  <thead>
                    <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                      <th class="p-3">#</th>
                      <th class="p-3">NIM</th>
                      <th class="p-3">Nama</th>
                      <th class="p-3">Program Studi</th>
                      <th class="p-3">Jumlah Pelanggaran</th>
                      <th class="p-3">Total Poin</th>
                      <th class="p-3">Predikat TXLY</th>
                      <th class="p-3">Degradasi Mutu</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                    <For each={paginatedRekapTop()}>
                      {(item, idx) => (
                        <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                          <td class="p-3">
                            {(rekapTopPagination.page() - 1) * rekapTopPagination.limit() + idx() + 1}
                          </td>
                          <td class="p-3 font-mono">{item.nim}</td>
                          <td class="p-3 font-bold text-secondary-800 dark:text-white">
                            <div class="flex items-center gap-2">
                              <StudentAvatar foto={item.foto} nama={item.nama} nim={item.nim} size="sm" />
                              {item.nama}
                            </div>
                          </td>
                          <td class="p-3">{item.prodiNama}</td>
                          <td class="p-3">{item.jumlahPelanggaran}</td>
                          <td class="p-3">
                            <span class="px-2 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100 font-bold dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                              {item.totalPoin}
                            </span>
                          </td>
                          <td class="p-3">
                            <span class="px-2.5 py-1 rounded-lg bg-action-50 text-action border border-brand-100 font-bold dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800">
                              {item.predikat}
                            </span>
                          </td>
                          <td class="p-3 font-bold text-rose-600 dark:text-rose-400">
                            -{item.degradasiNilaiSikap ?? 0}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={rekapTopPagination.page()}
                totalPages={totalRekapTopPages()}
                total={rekap()?.topPelanggar?.length || 0}
                limit={rekapTopPagination.limit()}
                pageOptions={pageOptions}
                onPageChange={rekapTopPagination.setPage}
                onLimitChange={rekapTopPagination.setLimit}
              />
            </div>

            {/* Per prodi breakdown */}
            <Show when={(rekap()?.perProdi || []).length > 0}>
              <div>
                <h4 class="text-base font-bold text-secondary-700 border-b pb-2 mb-2 dark:text-secondary-200">
                  Per Program Studi
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <For each={rekap()?.perProdi || []}>
                    {(p) => (
                      <div class="p-3 bg-secondary-50 rounded-xl border border-secondary-100 dark:bg-secondary-800 dark:border-secondary-800">
                        <div class="text-caption font-bold text-secondary-800 dark:text-white">{p.prodiNama}</div>
                        <div class="text-fine text-secondary-500 dark:text-secondary-300 mt-1">
                          {p.totalPelanggaran} pelanggaran · {p.totalPoin} poin
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Per jenis breakdown */}
            <Show when={(rekap()?.perJenis || []).length > 0}>
              <div>
                <div class="flex items-center justify-between border-b pb-2 mb-2">
                  <h4 class="text-base font-bold text-secondary-700 dark:text-secondary-200">Per Jenis Pelanggaran</h4>
                  <span class="text-fine text-secondary-400">{rekap()?.perJenis?.length || 0} jenis</span>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-caption border-collapse">
                    <thead>
                      <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                        <th class="p-3">Jenis</th>
                        <th class="p-3">Jumlah</th>
                        <th class="p-3">Total Poin</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                      <For each={paginatedRekapJenis()}>
                        {(j) => (
                          <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                            <td class="p-3">{j.jenis}</td>
                            <td class="p-3">{j.jumlah}</td>
                            <td class="p-3">{j.totalPoin}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={rekapJenisPagination.page()}
                  totalPages={totalRekapJenisPages()}
                  total={rekap()?.perJenis?.length || 0}
                  limit={rekapJenisPagination.limit()}
                  pageOptions={pageOptions}
                  onPageChange={rekapJenisPagination.setPage}
                  onLimitChange={rekapJenisPagination.setLimit}
                />
              </div>
            </Show>
          </div>
        </Show>

        {/* Tab 3: Daftar Mahasiswa TXLY (Staff View) */}
        <Show when={isStaff() && viewTab() === 'mahasiswa'}>
          <div class="bg-white border border-secondary-100 rounded-2xl p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-3">
              <div>
                <h3 class="font-bold text-secondary-800 dark:text-white">Daftar Mahasiswa & Predikat TXLY</h3>
                <p class="text-caption text-secondary-500 dark:text-secondary-300">
                  Ringkasan status kedisiplinan mahasiswa, predikat TXLY, degradasi mutu sikap, dan jumlah semester
                  berjalan.
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={handleExportMhsTxlyExcel}
                  class="flex items-center gap-1.5 py-1.5 px-3 text-caption font-semibold"
                  title="Ekspor daftar mahasiswa kedisiplinan ke file Excel (.xlsx)"
                >
                  <span aria-hidden="true">📊</span> <span class="hidden sm:inline">Ekspor Excel</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportMhsTxlyPDF}
                  class="flex items-center gap-1.5 py-1.5 px-3 text-caption font-semibold"
                  title="Ekspor daftar mahasiswa kedisiplinan ke dokumen PDF (.pdf)"
                >
                  <span aria-hidden="true">📄</span> <span class="hidden sm:inline">Ekspor PDF</span>
                </Button>
              </div>
            </div>

            {/* Filter Bar Mahasiswa TXLY */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-secondary-50/70 rounded-xl border border-secondary-100 dark:bg-secondary-800/50 dark:border-secondary-800">
              <div class="flex flex-col gap-1">
                <label
                  for="mhsTxlySearch"
                  class="text-fine font-bold text-secondary-500 dark:text-secondary-300 uppercase"
                >
                  Cari Mahasiswa
                </label>
                <Input
                  id="mhsTxlySearch"
                  type="text"
                  placeholder="Cari Nama atau NIM..."
                  ref={(el) => {
                    mhsTxlySearchEl = el;
                  }}
                  onInput={(e) => setMhsTxlySearch(e.currentTarget.value)}
                  class="w-full text-caption"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="mhsTxlyProdi"
                  class="text-fine font-bold text-secondary-500 dark:text-secondary-300 uppercase"
                >
                  Program Studi
                </label>
                <SearchableSelect
                  id="mhsTxlyProdi"
                  placeholder="Semua Program Studi..."
                  value={mhsTxlyProdi() ?? ''}
                  options={[
                    { label: 'Semua Program Studi', value: '' },
                    ...(prodiList() || []).map((p) => ({
                      label: `${p.nama} (${p.jenjang})`,
                      value: p.id,
                    })),
                  ]}
                  onChange={(val) => setMhsTxlyProdi(val ? Number(val) : undefined)}
                />
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="mhsTxlyPredikat"
                  class="text-fine font-bold text-secondary-500 dark:text-secondary-300 uppercase"
                >
                  Predikat TXLY
                </label>
                <input
                  id="mhsTxlyPredikat"
                  type="text"
                  placeholder="Semua / filter predikat (mis. T1L0)..."
                  value={mhsTxlyPredikat() ?? ''}
                  onInput={(e) => setMhsTxlyPredikat(e.currentTarget.value.trim() || undefined)}
                  class="w-full border border-secondary-200 rounded-lg px-3 py-1.5 text-caption focus:outline-none focus:border-action dark:border-secondary-700 dark:bg-secondary-800 dark:text-white"
                />
              </div>

              <div class="flex flex-col justify-end">
                <Show when={mhsTxlySearch() || mhsTxlyProdi() || mhsTxlyPredikat()}>
                  <button
                    onClick={() => {
                      setMhsTxlySearch('');
                      if (mhsTxlySearchEl) mhsTxlySearchEl.value = '';
                      setMhsTxlyProdi(undefined);
                      setMhsTxlyPredikat(undefined);
                    }}
                    class="px-3 py-2 text-caption text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 font-semibold transition-all dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    Reset Filter
                  </button>
                </Show>
              </div>
            </div>

            {/* Tabel Daftar Mahasiswa TXLY — stale-while-revalidate: tampilkan data
 lama selama refetch berjalan (tanpa flash penuh); spinner hanya saat
 belum pernah ada data. */}
            <Show
              when={!mahasiswaTxlyList.loading || mahasiswaTxlyList()}
              fallback={
                <div class="py-12 text-center text-secondary-400 dark:text-secondary-300 text-base">
                  Memuat data mahasiswa kedisiplinan...
                </div>
              }
            >
              <Show
                when={visibleMahasiswaTxly().length > 0}
                fallback={
                  <div class="py-12 text-center text-secondary-400 dark:text-secondary-300 text-base">
                    Tidak ada mahasiswa yang cocok dengan kriteria pencarian.
                  </div>
                }
              >
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-caption border-collapse">
                    <thead>
                      <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                        <th class="p-3">#</th>
                        <th scope="col" aria-sort={mhsTxlySortAria('nama')} class="p-3">
                          <button
                            type="button"
                            class="cursor-pointer select-none hover:text-action"
                            onClick={() => toggleMhsTxlySort('nama')}
                          >
                            Mahasiswa {mhsTxlySortField() === 'nama' ? (mhsTxlySortDir() === 'asc' ? '▲' : '▼') : ''}
                          </button>
                        </th>
                        <th scope="col" aria-sort={mhsTxlySortAria('nim')} class="p-3">
                          <button
                            type="button"
                            class="cursor-pointer select-none hover:text-action"
                            onClick={() => toggleMhsTxlySort('nim')}
                          >
                            NIM {mhsTxlySortField() === 'nim' ? (mhsTxlySortDir() === 'asc' ? '▲' : '▼') : ''}
                          </button>
                        </th>
                        <th scope="col" aria-sort={mhsTxlySortAria('prodiNama')} class="p-3">
                          <button
                            type="button"
                            class="cursor-pointer select-none hover:text-action"
                            onClick={() => toggleMhsTxlySort('prodiNama')}
                          >
                            Program Studi{' '}
                            {mhsTxlySortField() === 'prodiNama' ? (mhsTxlySortDir() === 'asc' ? '▲' : '▼') : ''}
                          </button>
                        </th>
                        <th scope="col" aria-sort={mhsTxlySortAria('semester')} class="p-3 text-center">
                          <button
                            type="button"
                            class="cursor-pointer select-none hover:text-action"
                            onClick={() => toggleMhsTxlySort('semester')}
                          >
                            Semester {mhsTxlySortField() === 'semester' ? (mhsTxlySortDir() === 'asc' ? '▲' : '▼') : ''}
                          </button>
                        </th>
                        <th scope="col" aria-sort={mhsTxlySortAria('jumlahPelanggaran')} class="p-3 text-center">
                          <button
                            type="button"
                            class="cursor-pointer select-none hover:text-action"
                            onClick={() => toggleMhsTxlySort('jumlahPelanggaran')}
                          >
                            Jumlah Pelanggaran{' '}
                            {mhsTxlySortField() === 'jumlahPelanggaran' ? (mhsTxlySortDir() === 'asc' ? '▲' : '▼') : ''}
                          </button>
                        </th>
                        <th scope="col" aria-sort={mhsTxlySortAria('predikat')} class="p-3 text-center">
                          <button
                            type="button"
                            class="cursor-pointer select-none hover:text-action"
                            onClick={() => toggleMhsTxlySort('predikat')}
                          >
                            Predikat TXLY{' '}
                            {mhsTxlySortField() === 'predikat' ? (mhsTxlySortDir() === 'asc' ? '▲' : '▼') : ''}
                          </button>
                        </th>
                        <th class="p-3 text-center">Total Poin</th>
                        <th class="p-3 text-center">Degradasi Mutu</th>
                        <th class="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                      <For each={paginatedMhsTxly()}>
                        {(item, idx) => (
                          <tr
                            onClick={() => openMahasiswaDetail(item)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openMahasiswaDetail(item);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            class="cursor-pointer transition-colors hover:bg-action-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-focus dark:hover:bg-brand-950/20"
                            title="Tekan Enter untuk melihat riwayat pelanggaran mahasiswa"
                          >
                            <td class="p-3 text-secondary-400">
                              {(mhsTxlyPagination.page() - 1) * mhsTxlyPagination.limit() + idx() + 1}
                            </td>
                            <td class="p-3 font-bold text-secondary-800 dark:text-white">
                              <div class="flex items-center gap-2">
                                <StudentAvatar foto={item.foto} nama={item.nama} nim={item.nim} size="sm" />
                                <div>
                                  <div class="hover:text-action transition-colors">{item.nama}</div>
                                  <div class="text-fine text-secondary-400 font-normal">
                                    {item.angkatan ? `Angkatan ${item.angkatan}` : ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td class="p-3 whitespace-nowrap font-mono">{item.nim}</td>
                            <td class="p-3">{item.prodiNama}</td>
                            <td class="p-3 text-center font-bold">{item.semester ? `Sem. ${item.semester}` : '-'}</td>
                            <td class="p-3 text-center font-bold text-secondary-700 dark:text-secondary-300">
                              {item.jumlahPelanggaran}
                            </td>
                            <td class="p-3 text-center">
                              <span class="px-2.5 py-1 rounded-lg bg-action-50 text-action border border-brand-100 font-bold dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800">
                                {item.predikat}
                              </span>
                            </td>
                            <td class="p-3 text-center">
                              <span class="px-2 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100 font-bold dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                                {item.totalPoin}
                              </span>
                            </td>
                            <td class="p-3 text-center font-bold text-rose-600 dark:text-rose-400">
                              -{item.degradasiNilaiSikap}
                            </td>
                            <td class="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <Button
                                onClick={() => openMahasiswaDetail(item)}
                                variant="secondary"
                                class="py-1 px-2.5 text-fine font-semibold flex items-center justify-center gap-1 mx-auto"
                                title="Lihat riwayat pelanggaran mahasiswa"
                                aria-label="Riwayat"
                              >
                                <span aria-hidden="true">👁️</span> <span class="hidden sm:inline">Riwayat</span>
                              </Button>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={mhsTxlyPagination.page()}
                  totalPages={totalMhsTxlyPages()}
                  total={visibleMahasiswaTxly().length}
                  limit={mhsTxlyPagination.limit()}
                  pageOptions={pageOptions}
                  onPageChange={mhsTxlyPagination.setPage}
                  onLimitChange={mhsTxlyPagination.setLimit}
                />
              </Show>
            </Show>
          </div>
        </Show>

        {/* Modal Riwayat Pelanggaran Mahasiswa (Klik Item Mahasiswa TXLY) */}
        <Modal
          show={!!selectedMhsDetail()}
          onClose={() => setSelectedMhsDetail(null)}
          title={`Riwayat Pelanggaran: ${selectedMhsDetail()?.nama || ''} (${selectedMhsDetail()?.nim || ''})`}
        >
          <div class="flex flex-col gap-5 max-w-4xl">
            {/* Student Summary Card */}
            <div class="p-4 rounded-xl bg-secondary-50 border border-secondary-200/80 flex flex-wrap items-center justify-between gap-4 dark:bg-secondary-800 dark:border-secondary-700">
              <div class="flex items-center gap-3">
                <StudentAvatar
                  foto={selectedMhsDetail()?.foto}
                  nama={selectedMhsDetail()?.nama || '-'}
                  nim={selectedMhsDetail()?.nim || '-'}
                  size="md"
                />
                <div>
                  <h4 class="font-bold text-secondary-800 dark:text-white text-base">{selectedMhsDetail()?.nama}</h4>
                  <p class="text-caption text-secondary-500 dark:text-secondary-300">
                    NIM: {selectedMhsDetail()?.nim} · {selectedMhsDetail()?.prodiNama} ·{' '}
                    {selectedMhsDetail()?.semester ? `Semester ${selectedMhsDetail()?.semester}` : ''}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <div class="flex flex-col items-center px-3 py-1 bg-white rounded-lg border border-secondary-200 dark:bg-secondary-900 dark:border-secondary-700">
                  <span class="text-fine uppercase text-secondary-400 font-semibold">Predikat</span>
                  <span class="font-bold text-action dark:text-brand-400 text-base">
                    {selectedMhsDetail()?.predikat}
                  </span>
                </div>
                <div class="flex flex-col items-center px-3 py-1 bg-white rounded-lg border border-secondary-200 dark:bg-secondary-900 dark:border-secondary-700">
                  <span class="text-fine uppercase text-secondary-400 font-semibold">Total Poin</span>
                  <span class="font-bold text-rose-600 dark:text-rose-400 text-base">
                    {selectedMhsDetail()?.totalPoin}
                  </span>
                </div>
                <div class="flex flex-col items-center px-3 py-1 bg-white rounded-lg border border-secondary-200 dark:bg-secondary-900 dark:border-secondary-700">
                  <span class="text-fine uppercase text-secondary-400 font-semibold">Degradasi Mutu</span>
                  <span class="font-bold text-rose-600 dark:text-rose-400 text-base">
                    -{selectedMhsDetail()?.degradasiNilaiSikap}
                  </span>
                </div>
              </div>
            </div>

            {/* Violation Records Table Header & Actions */}
            <div>
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h5 class="text-caption uppercase font-bold text-secondary-500 dark:text-secondary-300">
                  Daftar Pelanggaran Terdaftar ({mhsViolationsDetail()?.pelanggaranList?.length || 0})
                </h5>
                <div class="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleExportDetailExcel}
                    class="flex items-center gap-1.5 py-1 px-2.5 text-fine font-semibold"
                    title="Ekspor riwayat pelanggaran ke Excel (.xlsx)"
                  >
                    <span aria-hidden="true">📊</span> <span class="hidden sm:inline">Ekspor Excel</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleExportDetailPDF}
                    class="flex items-center gap-1.5 py-1 px-2.5 text-fine font-semibold"
                    title="Ekspor riwayat pelanggaran ke PDF (.pdf)"
                  >
                    <span aria-hidden="true">📄</span> <span class="hidden sm:inline">Ekspor PDF</span>
                  </Button>
                </div>
              </div>
              <Show
                when={!mhsViolationsDetail.loading}
                fallback={<div class="py-8 text-center text-secondary-400">Memuat riwayat pelanggaran...</div>}
              >
                <Show
                  when={(mhsViolationsDetail()?.pelanggaranList || []).length > 0}
                  fallback={
                    <div class="py-8 text-center text-secondary-400 text-caption">
                      Tidak ada catatan pelanggaran untuk mahasiswa ini.
                    </div>
                  }
                >
                  <div class="overflow-x-auto border border-secondary-100 rounded-xl dark:border-secondary-800">
                    <table class="w-full text-left text-caption border-collapse">
                      <thead class="sticky top-0 bg-secondary-50 text-secondary-500 font-bold uppercase border-b border-secondary-200 dark:bg-secondary-800 dark:text-secondary-300 dark:border-secondary-700">
                        <tr>
                          <th class="p-2.5">Tanggal</th>
                          <th class="p-2.5">Pasal</th>
                          <th class="p-2.5">Pelanggaran</th>
                          <th class="p-2.5">Sanksi</th>
                          <th class="p-2.5">Pelapor</th>
                          <th class="p-2.5">Keterangan</th>
                          <th class="p-2.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-secondary-50 dark:divide-secondary-800">
                        <For each={paginatedModalRiwayat()}>
                          {(v) => (
                            <tr class="hover:bg-secondary-50/40 dark:hover:bg-secondary-800/40">
                              <td class="p-2.5 whitespace-nowrap">{new Date(v.tanggal).toLocaleDateString('id-ID')}</td>
                              <td class="p-2.5 font-bold">{v.nomorPasal || '-'}</td>
                              <td class="p-2.5">{v.jenisPelanggaran}</td>
                              <td class="p-2.5">
                                <span
                                  class={`px-2 py-0.5 rounded border text-fine font-bold ${
                                    v.jenisSanksi === 4
                                      ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                      : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                  }`}
                                >
                                  {v.jenisSanksi === 4 ? 'Tertulis (-1.00)' : 'Lisan (-0.25)'}
                                </span>
                              </td>
                              <td class="p-2.5 text-secondary-500">{v.pelapor || '-'}</td>
                              <td class="p-2.5 max-w-xs truncate" title={v.keterangan}>
                                {v.keterangan}
                              </td>
                              <td class="p-2.5 text-center whitespace-nowrap">
                                <Button
                                  variant="secondary"
                                  onClick={() => openSpPrint(v)}
                                  class="py-1 px-2.5 text-fine font-semibold flex items-center justify-center gap-1 mx-auto"
                                  title="Cetak SP di jendela baru"
                                >
                                  <span>📄</span> Cetak SP
                                </Button>
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={modalRiwayatPagination.page()}
                    totalPages={totalModalRiwayatPages()}
                    total={modalRiwayatList().length}
                    limit={modalRiwayatPagination.limit()}
                    pageOptions={[5, 10, 20]}
                    onPageChange={modalRiwayatPagination.setPage}
                    onLimitChange={modalRiwayatPagination.setLimit}
                  />
                </Show>
              </Show>
            </div>

            <div class="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedMhsDetail(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Konfirmasi Hapus Pelanggaran */}
        <Modal show={!!deleteTarget()} onClose={() => setDeleteTarget(null)} title="Hapus Catatan Pelanggaran">
          <div class="flex flex-col gap-4">
            <p class="text-base text-secondary-600 dark:text-secondary-300">
              Hapus permanen catatan pelanggaran{' '}
              <span class="font-bold text-secondary-800 dark:text-white">{deleteTarget()?.jenisPelanggaran}</span> milik{' '}
              <span class="font-bold text-secondary-800 dark:text-white">{deleteTarget()?.namaMahasiswa}</span> (
              {deleteTarget()?.nim})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div class="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting()}>
                Batal
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleting()}>
                {deleting() ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Entry Pelanggaran */}
        <Modal
          show={showModal()}
          onClose={() => setShowModal(false)}
          title={editPelanggaranId() ? 'Edit Catatan Pelanggaran' : 'Catat Pelanggaran Baru'}
        >
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-rose-50 text-rose-600 rounded-xl text-caption font-semibold border border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                {errorMsg()}
              </div>
            </Show>

            {/* Select Mahasiswa */}
            <div class="flex flex-col gap-1">
              <SearchableSelect
                label="Pilih Mahasiswa"
                required
                placeholder="Cari NIM atau Nama Mahasiswa Aktif..."
                value={mahasiswaId()}
                options={mahasiswaList().map((m) => ({
                  label: `${m.nama} (${m.nim})${m.programStudi?.nama ? ` - ${m.programStudi.nama}` : ''}`,
                  value: m.id,
                }))}
                onChange={(val) => setMahasiswaId(Number(val))}
                onSearch={handleMahasiswaSearch}
                hasMore={mahasiswaHasMore()}
                onLoadMore={handleMahasiswaLoadMore}
                isLoading={mahasiswaLoading()}
              />
            </div>

            {/* Tanggal */}
            <Input
              label="Tanggal Pelanggaran"
              type="date"
              value={tanggal()}
              onInput={(e) => setTanggal(e.currentTarget.value)}
            />

            {/* Pasal BPA (opsional) */}
            <SearchableSelect
              label="Pasal Pelanggaran (BPA)"
              placeholder="Pilih pasal BPA (opsional, otomatis mengisi jenis pelanggaran & poin)..."
              value={pasalId() ?? ''}
              options={(pasalList() || []).map((p) => ({
                label: `${p.nomorPasal} - ${p.bunyiPasal.slice(0, 80)}${p.bunyiPasal.length > 80 ? '…' : ''}`,
                value: p.id,
              }))}
              onChange={handlePasalChange}
            />

            {/* Info pasal terpilih */}
            <Show when={selectedPasal()}>
              <div class="p-3 bg-action-50 border border-action-100 rounded-xl text-caption flex flex-col gap-1 dark:bg-secondary-800 dark:border-secondary-700">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-accent-800 dark:text-action-200 dark:text-action-ondark">
                    {selectedPasal()?.nomorPasal}
                  </span>
                  <span
                    class={`px-2 py-0.5 rounded border font-bold ${
                      selectedPasal()?.jenisSanksi === 4
                        ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                    }`}
                  >
                    {selectedPasal()?.jenisSanksi === 4 ? 'Tertulis (-1.00 Mutu)' : 'Lisan (-0.25 Mutu)'}
                  </span>
                </div>
                <p class="text-secondary-600 dark:text-secondary-300">{selectedPasal()?.bunyiPasal}</p>
              </div>
            </Show>

            {/* Jenis Pelanggaran */}
            <Input
              label="Jenis Pelanggaran"
              type="text"
              placeholder="Contoh: Terlambat Kelas Praktik, Kerusakan Fasilitas (otomatis terisi bila memilih pasal)"
              value={jenisPelanggaran()}
              onInput={(e) => setJenisPelanggaran(e.currentTarget.value)}
            />

            {/* Pelapor / Reported By */}
            <Input
              label="Dilaporkan Oleh (Pelapor)"
              type="text"
              placeholder="Nama dosen, instruktur, staf, atau satpam pelapor..."
              value={pelapor()}
              onInput={(e) => setPelapor(e.currentTarget.value)}
            />

            {/* Keterangan */}
            <div class="flex flex-col gap-1">
              <label class="text-caption font-bold text-secondary-700">Keterangan Pelanggaran</label>
              <textarea
                rows="4"
                placeholder="Tulis kronologi singkat atau rincian pelanggaran yang terjadi..."
                value={keterangan()}
                onInput={(e) => setKeterangan(e.currentTarget.value)}
                class="border border-secondary-200 rounded-xl p-3 text-caption focus:outline-none focus:border-action resize-none dark:border-secondary-700"
              />
            </div>

            <div class="flex justify-end gap-3 border-t pt-4 mt-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Simpan Pelanggaran
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Preview & Cetak Surat Peringatan (SP) Sesuai BPA */}
        <Modal
          show={showSpModal()}
          onClose={() => setShowSpModal(false)}
          title="Dokumen Surat Peringatan (SP) Mahasiswa"
        >
          <Show when={selectedSpItem()}>
            {(sp) => {
              const isTertulis = () => sp().jenisSanksi === 4;
              return (
                <div class="flex flex-col gap-5 text-secondary-800 dark:text-secondary-100">
                  {/* Printable Document Box */}
                  <div
                    id="printable-sp"
                    class="p-6 bg-white border border-secondary-200 rounded-xl text-secondary-900 dark:bg-secondary-900 dark:border-secondary-700 dark:text-white"
                  >
                    {/* Kop surat global + baris kementerian pada judul */}
                    <KopSurat kop={kop() ?? KOPI_FALLBACK} />

                    {/* Judul Surat */}
                    <div class="text-center my-3">
                      <p class="text-fine font-semibold tracking-widest text-secondary-600 dark:text-secondary-300">
                        KEMENTERIAN PENDIDIKAN TINGGI, RISET, DAN TEKNOLOGI
                      </p>
                      <h4 class="text-base font-bold underline uppercase">
                        SURAT PERINGATAN KEDISIPLINAN {isTertulis() ? 'TERTULIS (SP TERTULIS)' : 'LISAN (SP LISAN)'}
                      </h4>
                      <p class="text-fine text-secondary-500 dark:text-secondary-400">
                        Berdasarkan Buku Pedoman Akademik (BPA) Pasal 25, 26, & 28
                      </p>
                    </div>

                    {/* Identitas Mahasiswa */}
                    <div class="my-3 text-caption bg-secondary-50 p-3 rounded-lg border border-secondary-100 dark:bg-secondary-800/50 dark:border-secondary-700 flex items-center gap-4">
                      <StudentAvatar foto={sp().foto} nama={sp().namaMahasiswa || '-'} nim={sp().nim} size="lg" />
                      <div class="flex flex-col gap-1 flex-1">
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">Nama Mahasiswa</span>
                          <span class="col-span-2 font-bold">: {sp().namaMahasiswa || '-'}</span>
                        </div>
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">NIM</span>
                          <span class="col-span-2 font-mono font-bold">: {sp().nim || '-'}</span>
                        </div>
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">Program Studi</span>
                          <span class="col-span-2">: {sp().prodiNama || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Rincian Pelanggaran */}
                    <div class="my-3 text-caption flex flex-col gap-2">
                      <p class="leading-relaxed">
                        Dengan ini diberikan peringatan indisipliner kepada mahasiswa bersangkutan atas pelanggaran yang
                        terjadi pada:
                      </p>

                      <div class="p-3 border border-secondary-200 rounded-lg dark:border-secondary-700 flex flex-col gap-1.5">
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">Tanggal Kejadian</span>
                          <span class="col-span-2 font-medium">
                            : {new Date(sp().tanggal).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                          </span>
                        </div>
                        <Show when={sp().nomorPasal}>
                          <div class="grid grid-cols-3">
                            <span class="font-semibold text-secondary-500 dark:text-secondary-400">Pasal BPA</span>
                            <span class="col-span-2 font-bold text-action dark:text-brand-400">
                              : {sp().nomorPasal} - {sp().bunyiPasal}
                            </span>
                          </div>
                        </Show>
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">
                            Jenis Pelanggaran
                          </span>
                          <span class="col-span-2 font-bold">: {sp().jenisPelanggaran}</span>
                        </div>
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">Tingkat Sanksi</span>
                          <span class="col-span-2 font-bold">
                            :{' '}
                            {isTertulis()
                              ? 'Peringatan Tertulis (Degradasi Nilai Mutu Sikap -1.00)'
                              : 'Peringatan Lisan (Degradasi Nilai Mutu Sikap -0.25)'}
                          </span>
                        </div>
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">Dilaporkan Oleh</span>
                          <span class="col-span-2 font-bold text-action dark:text-action dark:text-action-ondark">
                            : {sp().pelapor || 'Petugas Kedisiplinan'}
                          </span>
                        </div>
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">
                            Keterangan / Kronologi
                          </span>
                          <span class="col-span-2 italic text-secondary-700 dark:text-secondary-300">
                            :"{sp().keterangan}"
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sanksi & Pernyataan */}
                    <p class="text-fine text-secondary-500 dark:text-secondary-400 leading-relaxed my-2">
                      Mahasiswa diharapkan mematuhi Buku Pedoman Akademik Politeknik Sorowako. Apabila melakukan
                      pelanggaran berulang, akan dikenakan sanksi peringatan tingkat berikutnya hingga pemberhentian
                      (Drop Out).
                    </p>

                    {/* Kolom Tanda Tangan Resmi Sesuai BPA */}
                    <div class="mt-8 pt-4 border-t border-dashed border-secondary-300 dark:border-secondary-700 grid grid-cols-3 text-center text-caption gap-4">
                      <div class="flex flex-col justify-between h-28">
                        <span class="font-semibold">Mahasiswa Bersangkutan,</span>
                        <div>
                          <p class="font-bold underline">{sp().namaMahasiswa || '....................'}</p>
                          <p class="text-fine text-secondary-500 dark:text-secondary-300">
                            NIM. {sp().nim || '...............'}
                          </p>
                        </div>
                      </div>

                      <div class="flex flex-col justify-between h-28">
                        <span class="font-semibold">
                          Mengetahui,
                          <br />
                          Dosen Pembimbing Akademik
                        </span>
                        <div>
                          <p class="font-bold underline">_________________________</p>
                          <p class="text-fine text-secondary-500 dark:text-secondary-300">NIP/NIDN Dosen PA</p>
                        </div>
                      </div>

                      <div class="flex flex-col justify-between h-28">
                        <span class="font-semibold">
                          Menyetujui,
                          <br />
                          Ketua Program Studi
                        </span>
                        <div>
                          <p class="font-bold underline">_________________________</p>
                          <p class="text-fine text-secondary-500 dark:text-secondary-300">Ketua Program Studi</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div class="flex justify-end gap-3 border-t pt-4 dark:border-secondary-800">
                    <Button type="button" variant="secondary" onClick={() => setShowSpModal(false)}>
                      Tutup
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => window.print()}
                      class="flex items-center gap-2 font-bold"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                      Cetak Surat Peringatan
                    </Button>
                  </div>
                </div>
              );
            }}
          </Show>
        </Modal>

        {/* Import CSV Modal */}
        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          title="Pelanggaran / Peringatan"
          importUrl="/pelanggaran/import"
          templateHeaders={[
            'nim',
            'tanggal',
            'nomor_pasal',
            'jenis_pelanggaran',
            'jenis_sanksi',
            'pelapor',
            'keterangan',
          ]}
          customTemplateRows={[
            ['nim', 'tanggal', 'nomor_pasal', 'jenis_pelanggaran', 'jenis_sanksi', 'pelapor', 'keterangan'],
            [
              '202301001',
              '2026-06-27',
              'Pasal 2',
              'Terlambat masuk kelas praktikum',
              'L',
              'Budi Santoso, M.T.',
              'Terlambat lebih dari 30 menit tanpa alasan sah.',
            ],
            [
              '202301002',
              '2026-06-27',
              '',
              'Merusak fasilitas laboratorium',
              'T',
              'Satpam Kampus',
              'Melaporkan kerusakan keyboard praktikum.',
            ],
          ]}
          onSuccess={refetchAllViolations}
        />
      </div>
    </MainLayout>
  );
}
