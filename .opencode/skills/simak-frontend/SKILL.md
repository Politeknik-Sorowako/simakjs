---
name: simak-frontend
description: Standar rekayasa frontend SolidJS dan UI Design System (DESIGN.md) untuk SIMAK Vokasi. Menegakkan integritas reaktivitas props (tanpa destruktur), rendering list bertipe aman, struktur layout standar, penanganan Eden Calendar Date vs Timestamp, serta estetika Apple Design System.
---

# SIMAK Frontend Skill — OpenCode

Skill ini memuat instruksi mutlak dan best practices untuk agen OpenCode saat mengimplementasikan atau memodifikasi kode frontend (`apps/frontend`) pada ekosistem SolidJS di SIMAK Vokasi, dengan mengacu penuh pada standar desain `@DESIGN.md`.

---

## 1. Rules & Hard Guardrails

Setiap komponen dan modul frontend WAJIB mematuhi aturan ketat berikut:

1. **UI & Design System Reference (`DESIGN.md`)**:
   - **WAJIB merujuk `@DESIGN.md`** sebagai acuan tunggal token warna, tipografi, radius, elevasi, dan estetika komponen sebelum menulis kode UI.
   - **Color Palette**:
     - Primary Action: Action Blue `#0066cc` (hover/focus: `#0071e3`, on-dark: `#2997ff`, text on primary: `#ffffff`).
     - Neutral Ink: Body/Ink `#1d1d1f`, ink-muted `#7a7a7a` / `#333333`, white on dark `#ffffff`.
     - Surfaces & Canvases: Canvas `#ffffff`, Parchment `#f5f5f7`, Pearl surface `#fafafc`, Dark tile `#272729` / `#2a2a2c`.
     - Dividers: Hairline `#e0e0e0` / `rgba(0, 0, 0, 0.08)`, soft divider `#f0f0f0`.
   - **Typography (SF Pro / Inter Stack)**:
     - Font family: `"SF Pro Display", "SF Pro Text", system-ui, -apple-system, Inter, sans-serif`.
     - Body copy: **17px** (line-height 1.47, tracking `-0.374px`), bukan standar SaaS 16px.
     - Headlines & Display: Negative letter-spacing / tight tracking (`-0.01em` hingga `-0.02em`).
     - Weight Ladder: **300 / 400 / 600 / 700** (DILARANG menggunakan weight 500 — mid-weight headline selalu 600).
   - **Component Geometry & Micro-interactions**:
     - Primary Button: Signature pill capsule `rounded-full` (`rounded.pill`), padding `11px 22px`, micro-interaction `active:scale-95 transition-transform duration-150`.
     - Secondary Button: Ghost pill `rounded-full` dengan border `#0066cc` dan text `#0066cc`.
     - Utility Card: `rounded-2xl` (`18px`), padding `24px` (`spacing.lg`), hairline border `1px border-neutral-200/80 dark:border-neutral-800`.
     - Navigation / Sticky Header: Frosted-glass effect dengan `backdrop-blur-md bg-white/80 dark:bg-neutral-900/80`.
     - Elevation & Shadows: DILARANG menggunakan drop-shadow berlebihan pada card/chrome. Gunakan kontras permukaan (*light tile ↔ dark tile*) dan hairline border untuk hierarki visual.
2. **Integritas Reaktivitas Props (DILARANG Destruktur Props)**:
   - **DILARANG KERAS mendestruktur props** pada parameter fungsi komponen SolidJS (misal: `({ title, isOpen }) =>`).
   - Destrukturisasi langsung merusak getter/proxy SolidJS dan membuat reaktivitas terputus secara permanen (*silent reactivity failure*).
   - Selalu terima `props` sebagai satu objek tunggal: `function MyComponent(props: ComponentProps)`.
   - Akses nilai secara reaktif langsung lewat `props.title`, `props.isOpen`, dll. Jika butuh pemisahan props, gunakan helper `splitProps` dari `'solid-js'`.
3. **Struktur Komponen Halaman**:
   - Setiap route/page component WAJIB diekspor sebagai fungsi deklarasi standar dengan `export default`.
   - Komponen halaman WAJIB dibungkus di dalam `<MainLayout>`.
4. **Primitif Reaktivitas SolidJS**:
   - Gunakan primitif resmi SolidJS: `createSignal`, `createResource`, `createMemo`, `createEffect`, `onMount`.
   - DILARANG menggunakan hook React (`useState`, `useEffect`, `useMemo`, `useCallback`). SolidJS tidak berjalan dengan Virtual DOM re-rendering.
5. **Rendering List `<For>` & Typing**:
   - Saat me-render dynamic array dari API menggunakan komponen `<For>`, WAJIB mendefinisikan interface bernama atau menggunakan `SafeAny` (`Record<string, unknown>`).
   - Dilarang membiarkan callback argument menjadi inferred `any` yang melanggar strict mode.
6. **Penanganan Eden Date (Calendar Date vs Timestamp)**:
   - **Kolom `date()` (Kalender murni: `tanggal`, `tanggalLahir`, `tanggalBimbingan`)**: Berformat plain string `'YYYY-MM-DD'`. DILARANG melakukan round-trip lewat `new Date(str).toISOString()` karena akan menggeser hari akibat perbedaan timezone (*off-by-one day bug*).
   - Tampilkan string kalender langsung atau gunakan formatter lokal (seperti `Intl.DateTimeFormat` atau helper lokal yang tidak mengubah tanggal).
   - DILARANG menggunakan `new Date(x).toISOString().split('T')[0]` untuk menghasilkan tanggal hari ini. Gunakan helper lokal aman: `formatLocalDate(new Date())` berbasis `getFullYear()`, `getMonth()`, `getDate()`.
   - **Kolom `timestamp()` (`createdAt`, `updatedAt`)**: Diterima sebagai ISO string, format ke tampilan lokal sesuai kebutuhan.
7. **Strict Error Handling & Types**:
   - No `any` type (`biome.json` `noExplicitAny: error`).
   - Gunakan `catch (e: unknown)` dan periksa `e instanceof Error ? e.message : 'Error message'`.

---

## 2. Code Patterns: Bad vs Good Examples

### A. Apple UI Design System (`DESIGN.md`) vs Generic Styling

#### ❌ BAD (Warna acak generic, shadow berlebihan, font tidak sesuai spec)
```tsx
// BAD: Menggunakan generic blue, shadow tebal, border-radius canggung, font 16px
export function BadCard() {
  return (
    <div class="bg-blue-500 shadow-2xl rounded-md p-2 text-base">
      <h3 class="font-medium text-white">Title</h3>
      <button class="bg-green-600 rounded p-1 shadow-lg">Submit</button>
    </div>
  );
}
```

#### ✅ GOOD (Apple aesthetic: Action Blue, Parchment, Pill Button, Hairline border, SF/Inter typography)
```tsx
// GOOD: Mengacu pada DESIGN.md — 17px body, negative tracking, pill CTA, subtle hairline
import { Show } from 'solid-js';

interface CardProps {
  title: string;
  subtitle?: string;
  onAction?: () => void;
}

export function ActionCard(props: CardProps) {
  return (
    <div class="bg-[#fafafc] dark:bg-[#272729] rounded-[18px] border border-[#e0e0e0] dark:border-neutral-800 p-6 transition-all duration-200">
      <h3 class="text-[21px] font-semibold tracking-[-0.015em] text-[#1d1d1f] dark:text-white">
        {props.title}
      </h3>
      <Show when={props.subtitle}>
        <p class="mt-2 text-[17px] leading-[1.47] tracking-[-0.02em] text-[#7a7a7a] dark:text-neutral-400">
          {props.subtitle}
        </p>
      </Show>
      <div class="mt-6 flex items-center gap-3">
        {/* Signature Apple Primary Pill Button */}
        <button
          onClick={props.onAction}
          class="inline-flex items-center justify-center px-[22px] py-[11px] rounded-full bg-[#0066cc] hover:bg-[#0071e3] text-white text-[17px] font-normal active:scale-95 transition-all duration-150"
        >
          Lanjutkan
        </button>
        {/* Ghost Pill Button */}
        <button
          class="inline-flex items-center justify-center px-[22px] py-[11px] rounded-full border border-[#0066cc] text-[#0066cc] dark:text-[#2997ff] text-[17px] font-normal hover:bg-[#0066cc]/5 active:scale-95 transition-all duration-150"
        >
          Pelajari Lebih Lanjut
        </button>
      </div>
    </div>
  );
}
```

---

### B. Props Reactivity & Destructuring

#### ❌ BAD (Destruktur props merusak reaktivitas SolidJS)
```tsx
// BAD: Props didestruktur di parameter! Ketika parent update `title` atau `isOpen`,
// komponen ini TIDAK AKAN mengupdate tampilannya!
interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BadModal({ title, isOpen, onClose }: ModalProps) {
  return (
    <div class={isOpen ? 'block' : 'hidden'}>
      <h2>{title}</h2>
      <button onClick={onClose}>Tutup</button>
    </div>
  );
}
```

#### ✅ GOOD (Akses props secara utuh menjaga reactive proxy)
```tsx
// GOOD: Props diakses via `props.title`, reaktivitas SolidJS bekerja 100%
import { Show } from 'solid-js';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GoodModal(props: ModalProps) {
  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
        <div class="bg-white dark:bg-[#272729] rounded-[18px] p-6 max-w-md w-full border border-[#e0e0e0] dark:border-neutral-800">
          <h2 class="text-[21px] font-semibold text-[#1d1d1f] dark:text-white">{props.title}</h2>
          <div class="mt-4 flex justify-end">
            <button
              onClick={props.onClose}
              class="px-4 py-2 rounded-full bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f] text-sm active:scale-95 transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
```

---

### C. Struktur Halaman & MainLayout

#### ❌ BAD (Tanpa MainLayout, menggunakan React hook)
```tsx
// BAD: Menggunakan React hooks dan tanpa MainLayout
import { useState } from 'react'; // BUKAN SOLIDJS!

export const DashboardPage = () => {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
};
```

#### ✅ GOOD (Standard function, MainLayout wrapper, SolidJS primitives)
```tsx
import { createSignal, onMount } from 'solid-js';
import { MainLayout } from '../components/MainLayout';

export default function Dashboard() {
  const [count, setCount] = createSignal(0);

  onMount(() => {
    // Initial fetch / setup jika diperlukan
  });

  return (
    <MainLayout>
      <div class="space-y-6">
        <h1 class="text-[34px] font-semibold tracking-[-0.02em] text-[#1d1d1f] dark:text-white">
          Dashboard Akademik
        </h1>
        <div class="p-6 bg-[#fafafc] dark:bg-[#272729] rounded-[18px] border border-[#e0e0e0] dark:border-neutral-800">
          <p class="text-[17px] text-[#1d1d1f] dark:text-white">Total Hitungan: {count()}</p>
          <button
            onClick={() => setCount((c) => c + 1)}
            class="mt-4 px-5 py-2.5 rounded-full bg-[#0066cc] text-white text-[17px] active:scale-95 transition-transform"
          >
            Tambah
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
```

---

### D. List Rendering dengan `<For>` Bertipe Aman

#### ❌ BAD (Implicit any pada item iterasi)
```tsx
// BAD: Tanpa tipe data eksplisit, rentan compile error pada strict mode
<For each={dataList()}>
  {(item) => <div>{item.name}</div>}
</For>
```

#### ✅ GOOD (Interface bernama atau SafeAny)
```tsx
import { For } from 'solid-js';

interface MahasiswaItem {
  id: number;
  nim: string;
  nama: string;
  prodi: string;
}

// GOOD: Tipe data jelas dan terlindungi
<For each={mahasiswaList()}>
  {(item: MahasiswaItem) => (
    <div class="p-3 border-b border-[#e0e0e0] dark:border-neutral-800 flex justify-between text-[17px]">
      <span class="text-[#7a7a7a] font-mono">{item.nim}</span>
      <span class="font-medium text-[#1d1d1f] dark:text-white">{item.nama}</span>
    </div>
  )}
</For>
```

---

### E. Eden Date Handling (Anti Off-By-One Bug)

#### ❌ BAD (Round-trip toISOString memicu perubahan tanggal kalender)
```typescript
// BAD: Pada timezone GMT+7/GMT+8, toISOString() mengonversi jam 00:00 ke hari sebelumnya (UTC)!
// Contoh: '2026-08-01' -> new Date('2026-08-01') -> toISOString() -> '2026-07-31T16:00:00.000Z'
const badDate = new Date(row.tanggalLahir).toISOString().split('T')[0];
```

#### ✅ GOOD (Tampilkan string kalender langsung atau gunakan local formatter)
```typescript
// GOOD 1: Tampilkan langsung string YYYY-MM-DD dari wire format backend
export function formatCalendarDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  // dateStr sudah dalam format 'YYYY-MM-DD', langsung parse komponennya secara lokal:
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// GOOD 2: Menghasilkan tanggal hari ini secara aman tanpa UTC shifting
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

---

## 3. Verification Steps

Sebelum menyelesaikan implementasi frontend, jalankan perintah berikut:

```bash
# 1. Linting & formatting check seluruh codebase
bun run lint

# 2. Strict type check SolidJS frontend
cd apps/frontend && bunx tsc --noEmit
```
Pastikan seluruh pengecekan di atas menghasilkan EXIT CODE 0 tanpa error TypeScript atau Biome linter.
