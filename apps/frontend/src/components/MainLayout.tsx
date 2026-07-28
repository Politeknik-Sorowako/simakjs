import { createSignal, JSX, Show } from 'solid-js';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function MainLayout(props: { children: JSX.Element }) {
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <div class="min-h-screen flex bg-secondary-50/70 dark:bg-secondary-950 text-secondary-900 dark:text-secondary-100 relative overflow-hidden transition-colors duration-200">
      {/* Mobile Sidebar Backdrop Overlay */}
      <Show when={isOpen()}>
        <div
          onClick={() => setIsOpen(false)}
          class="fixed inset-0 bg-secondary-950/60 backdrop-blur-sm z-30 md:hidden"
        />
      </Show>

      {/* Sidebar Navigation */}
      <Sidebar isOpen={isOpen()} onClose={() => setIsOpen(false)} />

      {/* Main Body */}
      <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Navbar */}
        <Navbar onToggleSidebar={() => setIsOpen(!isOpen())} />

        {/* Content Viewport */}
        <main class="flex-1 p-4 md:p-8 overflow-y-auto w-full mx-auto">{props.children}</main>
      </div>

      {/* DEV Environment Overlay */}
      <Show when={import.meta.env.VITE_APP_MODE === 'development'}>
        <div class="fixed top-3 right-3 z-[100] px-3 py-1 bg-warning-500 text-secondary-950 text-xs font-bold rounded-full shadow-lg select-none pointer-events-none">
          DEV
        </div>
      </Show>
    </div>
  );
}
