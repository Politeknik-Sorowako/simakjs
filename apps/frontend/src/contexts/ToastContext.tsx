import {
	createContext,
	createSignal,
	For,
	type JSX,
	useContext,
} from "solid-js";

export interface Toast {
	id: string;
	message: string;
	type: "success" | "error" | "info";
}

interface ToastContextType {
	toasts: () => Toast[];
	showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>();

export function ToastProvider(props: { children: JSX.Element }) {
	const [toasts, setToasts] = createSignal<Toast[]>([]);

	const showToast = (
		message: string,
		type: "success" | "error" | "info" = "info",
	) => {
		const id = Math.random().toString(36).substring(2, 9);
		setToasts((prev) => [...prev, { id, message, type }]);

		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 3500);
	};

	return (
		<ToastContext.Provider value={{ toasts, showToast }}>
			{props.children}

			{/* Toast Portal Container */}
			<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
				<For each={toasts()}>
					{(toast) => (
						<div
							class={`p-4 rounded-xl shadow-lg text-white font-medium transition-all duration-300 pointer-events-auto flex items-center justify-between border animate-slide-down ${
								toast.type === "success"
									? "bg-gradient-to-r from-green-600 to-green-700 border-green-500/50 shadow-green-600/20"
									: toast.type === "error"
										? "bg-gradient-to-r from-red-600 to-red-700 border-red-500/50 shadow-red-600/20"
										: "bg-gradient-to-r from-brand-700 to-brand-800 border-brand-600/50 shadow-brand-700/20"
							}`}
						>
							<div class="flex items-center gap-3">
								{/* Icon */}
								<div
									class={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
										toast.type === "success"
											? "bg-white/20"
											: toast.type === "error"
												? "bg-white/20"
												: "bg-white/20"
									}`}
								>
									{toast.type === "success" ? (
										<svg
											class="w-4 h-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2.5"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									) : toast.type === "error" ? (
										<svg
											class="w-4 h-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2.5"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									) : (
										<svg
											class="w-4 h-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2.5"
												d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									)}
								</div>
								<span class="text-sm">{toast.message}</span>
							</div>
							<button
								onClick={() =>
									setToasts((prev) => prev.filter((t) => t.id !== toast.id))
								}
								class="ml-4 text-white/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg p-1 transition-colors"
								aria-label="Tutup notifikasi"
							>
								<svg
									class="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					)}
				</For>
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return context;
}
