import { JSX } from 'solid-js';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function MainLayout(props: { children: JSX.Element }) {
  return (
    <div class="min-h-screen flex bg-gray-50/50">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Body */}
      <div class="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <Navbar />

        {/* Content Viewport */}
        <main class="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {props.children}
        </main>
      </div>
    </div>
  );
}
