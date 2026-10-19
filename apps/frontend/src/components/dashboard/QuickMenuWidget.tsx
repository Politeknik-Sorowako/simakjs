import { A } from '@solidjs/router';
import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { getDefaultQuickMenusForRoles, MASTER_QUICK_MENUS, type QuickMenuItem } from '../../config/quickMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { userController } from '../../controllers/userController';
import { QuickMenuCustomizeModal } from './QuickMenuCustomizeModal';

export function QuickMenuWidget() {
  const auth = useAuth();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = createSignal(false);

  const currentUserRoles = () => {
    const u = auth.user();
    if (!u) return [];
    return u.roles && u.roles.length > 0 ? u.roles : [u.role];
  };

  // Menus in master catalog that are accessible to the current user's roles
  const allowedMasterMenus = createMemo(() => {
    const roles = currentUserRoles();
    return MASTER_QUICK_MENUS.filter((menu) => menu.roles.some((r) => roles.includes(r)));
  });

  const [quickMenuIds, { mutate }] = createResource(async () => {
    try {
      const res = await userController.getQuickMenu();
      if (Array.isArray(res.quickMenu) && res.quickMenu.length > 0) {
        return res.quickMenu;
      }
    } catch {
      // Ignored: fallback to defaults
    }
    return getDefaultQuickMenusForRoles(currentUserRoles());
  });

  const activeMenus = createMemo(() => {
    const ids = quickMenuIds() || [];
    const allowed = allowedMasterMenus();
    const map = new Map<string, QuickMenuItem>(allowed.map((m) => [m.id, m]));
    const items: QuickMenuItem[] = [];

    for (const id of ids) {
      const found = map.get(id);
      if (found) items.push(found);
      if (items.length >= 6) break;
    }

    // Fallback if none matched
    if (items.length === 0 && allowed.length > 0) {
      return allowed.slice(0, Math.min(6, allowed.length));
    }
    return items;
  });

  const handleSavePreferences = async (newIds: string[]) => {
    await userController.updateQuickMenu(newIds);
    mutate(newIds);
    toast.showToast('Menu cepat berhasil diperbarui', 'success');
  };

  const handleResetDefault = async () => {
    const defaultIds = getDefaultQuickMenusForRoles(currentUserRoles());
    await userController.updateQuickMenu(defaultIds);
    mutate(defaultIds);
    toast.showToast('Menu cepat dikembalikan ke setelan default', 'info');
  };

  const getColorClasses = (color: QuickMenuItem['color']) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500';
      case 'indigo':
        return 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500';
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white dark:group-hover:bg-emerald-500';
      case 'amber':
        return 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white dark:group-hover:bg-amber-500';
      case 'purple':
        return 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white dark:group-hover:bg-purple-500';
      case 'rose':
        return 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white dark:group-hover:bg-rose-500';
      case 'teal':
        return 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white dark:group-hover:bg-teal-500';
      case 'orange':
        return 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white dark:group-hover:bg-orange-500';
      default:
        return 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-200';
    }
  };

  return (
    <div class="bg-white/90 dark:bg-secondary-900/90 backdrop-blur-md rounded-2xl border border-secondary-200/80 dark:border-secondary-800 p-5 sm:p-6 shadow-xs transition-colors">
      {/* Header */}
      <div class="flex items-center justify-between gap-4 mb-4">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-[#0066cc]/10 dark:bg-[#2997ff]/20 text-[#0066cc] dark:text-[#2997ff] flex items-center justify-center font-bold">
            ⚡
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-secondary-900 dark:text-white tracking-tight">
              Akses Cepat
            </h2>
            <p class="text-[11px] sm:text-xs text-secondary-500 dark:text-secondary-400">Pintasan menu harian Anda</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-secondary-600 dark:text-secondary-300 hover:text-[#0066cc] dark:hover:text-[#2997ff] hover:bg-secondary-100 dark:hover:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 transition-colors cursor-pointer"
        >
          <span>⚙️</span>
          <span>Atur Menu</span>
        </button>
      </div>

      {/* Grid Menu Cards */}
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <For each={activeMenus()}>
          {(menu) => (
            <A
              href={menu.href}
              class="group flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-secondary-50/60 hover:bg-white dark:bg-secondary-800/40 dark:hover:bg-secondary-800 border border-secondary-200/60 dark:border-secondary-700/60 hover:border-secondary-300 dark:hover:border-secondary-600 transition-all duration-200 active:scale-95 text-center shadow-2xs hover:shadow-md hover:-translate-y-0.5"
            >
              <div
                class={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-200 mb-2.5 shadow-2xs ${getColorClasses(
                  menu.color,
                )}`}
              >
                <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" d={menu.svgPath} />
                </svg>
              </div>

              <span class="text-xs sm:text-sm font-semibold text-secondary-900 dark:text-white line-clamp-1 group-hover:text-[#0066cc] dark:group-hover:text-[#2997ff] transition-colors leading-snug">
                {menu.title}
              </span>
              <span class="text-[10px] sm:text-[11px] text-secondary-400 dark:text-secondary-500 line-clamp-1 mt-0.5">
                {menu.description}
              </span>
            </A>
          )}
        </For>
      </div>

      {/* Customize Modal */}
      <QuickMenuCustomizeModal
        isOpen={isModalOpen()}
        onClose={() => setIsModalOpen(false)}
        selectedMenuIds={quickMenuIds() || []}
        availableMenus={allowedMasterMenus()}
        onSave={handleSavePreferences}
        onResetDefault={handleResetDefault}
      />
    </div>
  );
}
