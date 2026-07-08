import { createSignal, JSX, Show } from 'solid-js';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function MainLayout(props: { children: JSX.Element }) {
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <div class="min-h-screen flex bg-secondary-50/50 dark:bg-secondary-950 text-secondary-800 dark:text-secondary-200 relative overflow-hidden transition-colors duration-200">
      {/* Mobile Sidebar Backdrop Overlay */}
      <Show when={isOpen()}>
        <div onClick={() => setIsOpen(false)} class="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm z-30 md:hidden" />
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
    </div>
  );
}
