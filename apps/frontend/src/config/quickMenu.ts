import type { JSX } from 'solid-js';
import type { UserRole } from '../contexts/AuthContext';

export interface QuickMenuItem {
  id: string;
  title: string;
  description: string;
  href: string;
  roles: UserRole[];
  color: 'blue' | 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose' | 'teal' | 'orange';
  svgPath: string;
}

export const MASTER_QUICK_MENUS: QuickMenuItem[] = [
  {
    id: 'krs',
    title: 'KRS Online',
    description: 'Rencana studi semester',
    href: '/krs',
    roles: ['mahasiswa', 'dosen', 'kaprodi', 'prodi', 'admin', 'super_admin'],
    color: 'blue',
    svgPath:
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    id: 'khs',
    title: 'KHS & Transkrip',
    description: 'Hasil studi & nilai',
    href: '/khs',
    roles: ['mahasiswa', 'dosen', 'kaprodi', 'prodi', 'admin', 'super_admin'],
    color: 'emerald',
    svgPath:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    id: 'presensi-saya',
    title: 'Presensi Saya',
    description: 'Rekap kehadiran & izin',
    href: '/presensi-saya',
    roles: ['mahasiswa'],
    color: 'indigo',
    svgPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'pelanggaran',
    title: 'Poin Pelanggaran',
    description: 'Catatan disiplin & kompensasi',
    href: '/pelanggaran',
    roles: ['mahasiswa', 'dosen', 'kemahasiswaan', 'admin', 'super_admin'],
    color: 'rose',
    svgPath:
      'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  {
    id: 'bimbingan',
    title: 'Bimbingan Akademik',
    description: 'Konsultasi PA & akademik',
    href: '/bimbingan',
    roles: ['mahasiswa', 'dosen', 'instruktur', 'kaprodi', 'prodi', 'admin', 'super_admin'],
    color: 'purple',
    svgPath:
      'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'presensi-apel',
    title: 'Presensi Apel',
    description: 'Catatan & verifikasi apel',
    href: '/presensi-apel',
    roles: ['dosen', 'instruktur', 'prodi', 'kaprodi', 'admin', 'super_admin'],
    color: 'orange',
    svgPath:
      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.478 4.482 9.957 9 10.886V21h-2v2h6v-2h-2v-1.114a11.005 11.005 0 006-3.136',
  },
  {
    id: 'pengumuman',
    title: 'Pengumuman',
    description: 'Pusat informasi kampus',
    href: '/pengumuman',
    roles: [
      'mahasiswa',
      'dosen',
      'instruktur',
      'kaprodi',
      'prodi',
      'admin',
      'super_admin',
      'keuangan',
      'plp',
      'kemahasiswaan',
    ],
    color: 'amber',
    svgPath:
      'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  },
  {
    id: 'input-nilai',
    title: 'Input Nilai',
    description: 'Penilaian mata kuliah',
    href: '/input-nilai',
    roles: ['dosen', 'instruktur', 'kaprodi', 'prodi', 'admin', 'super_admin'],
    color: 'teal',
    svgPath:
      'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  },
  {
    id: 'jurnal-presensi',
    title: 'Jurnal Presensi',
    description: 'Presensi pertemuan kelas',
    href: '/jurnal-presensi',
    roles: ['dosen', 'instruktur', 'kaprodi', 'prodi', 'admin', 'super_admin'],
    color: 'indigo',
    svgPath:
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    id: 'monitoring-bimbingan',
    title: 'Monitor Bimbingan',
    description: 'Pantau kemajuan bimbingan',
    href: '/monitoring-bimbingan',
    roles: ['dosen', 'kaprodi', 'prodi', 'admin', 'super_admin'],
    color: 'blue',
    svgPath:
      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
  {
    id: 'tugas-akhir',
    title: 'Tugas Akhir',
    description: 'Proposal, bimbingan & sidang',
    href: '/tugas-akhir',
    roles: ['mahasiswa', 'dosen', 'instruktur', 'kaprodi', 'prodi', 'admin', 'super_admin'],
    color: 'orange',
    svgPath:
      'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  },
  {
    id: 'mahasiswa',
    title: 'Data Mahasiswa',
    description: 'Direktori & status mahasiswa',
    href: '/mahasiswa',
    roles: ['admin', 'super_admin', 'prodi', 'kaprodi', 'keuangan'],
    color: 'blue',
    svgPath:
      'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    id: 'dosen',
    title: 'Data Dosen',
    description: 'Direktori dosen & pengajar',
    href: '/dosen',
    roles: ['admin', 'super_admin', 'prodi', 'kaprodi'],
    color: 'purple',
    svgPath:
      'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'program-studi',
    title: 'Program Studi',
    description: 'Kelola prodi & jenjang',
    href: '/program-studi',
    roles: ['admin', 'super_admin'],
    color: 'indigo',
    svgPath:
      'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
  {
    id: 'kelas-kuliah',
    title: 'Kelas Kuliah',
    description: 'Jadwal & rombel kelas',
    href: '/kelas-kuliah',
    roles: ['admin', 'super_admin', 'prodi', 'kaprodi'],
    color: 'teal',
    svgPath: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
  },
  {
    id: 'periode-akademik',
    title: 'Periode Akademik',
    description: 'Semester & jadwal krs',
    href: '/periode-akademik',
    roles: ['admin', 'super_admin'],
    color: 'amber',
    svgPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'kurikulum',
    title: 'Kurikulum OBE',
    description: 'Struktur mata kuliah & CPL',
    href: '/kurikulum',
    roles: ['admin', 'super_admin', 'prodi', 'kaprodi'],
    color: 'emerald',
    svgPath:
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    id: 'keuangan',
    title: 'Keuangan & Tagihan',
    description: 'Pembayaran UKT & beasiswa',
    href: '/keuangan',
    roles: ['keuangan', 'admin', 'super_admin'],
    color: 'emerald',
    svgPath:
      'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'laporan-keuangan',
    title: 'Laporan Keuangan',
    description: 'Rekapitulasi pembayaran',
    href: '/laporan/keuangan',
    roles: ['keuangan', 'admin', 'super_admin'],
    color: 'blue',
    svgPath:
      'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
];

export const DEFAULT_ROLE_QUICK_MENUS: Record<string, string[]> = {
  mahasiswa: ['krs', 'khs', 'presensi-saya', 'pelanggaran', 'bimbingan', 'pengumuman'],
  dosen: ['input-nilai', 'jurnal-presensi', 'bimbingan', 'monitoring-bimbingan', 'tugas-akhir', 'pengumuman'],
  instruktur: ['input-nilai', 'jurnal-presensi', 'bimbingan', 'tugas-akhir', 'pengumuman'],
  kaprodi: ['kurikulum', 'kelas-kuliah', 'input-nilai', 'dosen', 'monitoring-bimbingan', 'pengumuman'],
  prodi: ['kurikulum', 'kelas-kuliah', 'input-nilai', 'dosen', 'monitoring-bimbingan', 'pengumuman'],
  admin: ['mahasiswa', 'dosen', 'program-studi', 'kelas-kuliah', 'periode-akademik', 'pengumuman'],
  super_admin: ['mahasiswa', 'dosen', 'program-studi', 'kelas-kuliah', 'periode-akademik', 'pengumuman'],
  keuangan: ['keuangan', 'laporan-keuangan', 'mahasiswa', 'pengumuman'],
  kemahasiswaan: ['pelanggaran', 'bimbingan', 'mahasiswa', 'pengumuman'],
};

export function getDefaultQuickMenusForRoles(roles: UserRole[]): string[] {
  for (const role of roles) {
    if (DEFAULT_ROLE_QUICK_MENUS[role]) {
      return DEFAULT_ROLE_QUICK_MENUS[role];
    }
  }
  return ['pengumuman'];
}
