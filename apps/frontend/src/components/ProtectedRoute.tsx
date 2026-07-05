import { useNavigate } from "@solidjs/router";
import { createEffect, type JSX, Show } from "solid-js";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
	children: JSX.Element;
	allowedRoles?: (
		| "admin"
		| "dosen"
		| "mahasiswa"
		| "prodi"
		| "keuangan"
		| "guest"
	)[];
}

export function ProtectedRoute(props: ProtectedRouteProps) {
	const auth = useAuth();
	const navigate = useNavigate();

	createEffect(() => {
		if (!auth.isAuthenticated()) {
			navigate("/login", { replace: true });
		}
	});

	const hasAccess = () => {
		if (!auth.isAuthenticated()) return false;
		const userRole = auth.user()?.role;
		if (!props.allowedRoles) return true;
		return props.allowedRoles.includes(userRole as any);
	};

	return (
		<Show
			when={hasAccess()}
			fallback={
				<div class="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-brand-gray-100 dark:border-slate-800 shadow-card dark:shadow-card-dark">
					<div class="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4">
						<svg
							class="w-8 h-8 text-red-500 dark:text-red-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-heading font-bold text-brand-900 dark:text-white mb-2">
						Akses Ditolak
					</h2>
					<p class="text-brand-gray-500 dark:text-slate-400 mb-6">
						Anda tidak memiliki hak untuk mengakses halaman ini.
					</p>
					<button
						onClick={() => navigate("/dashboard")}
						class="px-5 py-2.5 bg-gradient-to-r from-brand-800 to-brand-900 hover:from-brand-700 hover:to-brand-800 text-white rounded-xl font-semibold shadow-md shadow-brand-900/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 active:scale-[0.98]"
					>
						Kembali ke Dashboard
					</button>
				</div>
			}
		>
			{props.children}
		</Show>
	);
}
