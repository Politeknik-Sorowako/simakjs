import { createSignal, type JSX, Show } from "solid-js";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function MainLayout(props: { children: JSX.Element }) {
	const [isOpen, setIsOpen] = createSignal(false);

	return (
		<div class="min-h-screen flex bg-brand-50/40 dark:bg-slate-950 text-gray-800 dark:text-slate-100 relative overflow-hidden transition-colors duration-200">
			{/* Mobile Sidebar Backdrop Overlay */}
			<Show when={isOpen()}>
				<div
					onClick={() => setIsOpen(false)}
					class="fixed inset-0 bg-brand-900/40 backdrop-blur-sm z-30 md:hidden animate-fade-in"
				/>
			</Show>

			{/* Sidebar Navigation */}
			<Sidebar isOpen={isOpen()} onClose={() => setIsOpen(false)} />

			{/* Main Body */}
			<div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
				{/* Navbar */}
				<Navbar onToggleSidebar={() => setIsOpen(!isOpen())} />

				{/* Content Viewport */}
				<main class="flex-1 p-4 md:p-8 overflow-y-auto w-full mx-auto content-gradient">
					{props.children}
				</main>
			</div>
		</div>
	);
}
