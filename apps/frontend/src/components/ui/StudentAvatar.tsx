import { createSignal, Show } from 'solid-js';
import { API_URL } from '../../utils/api';
import { Modal } from './Modal';

interface StudentAvatarProps {
  foto?: string | null;
  nama: string;
  nim?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  class?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
};

export function StudentAvatar(props: StudentAvatarProps) {
  const [showModal, setShowModal] = createSignal(false);
  const sizeClass = () => sizeClasses[props.size || 'md'];
  const fotoUrl = () => (props.foto ? `${API_URL}${props.foto}` : null);

  return (
    <>
      <button
        type="button"
        title={props.foto ? 'Klik untuk memperbesar' : props.nama}
        onClick={() => setShowModal(true)}
        class={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-secondary-200 dark:border-secondary-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${sizeClass()} ${
          props.foto ? 'cursor-zoom-in hover:ring-2 hover:ring-brand-500/40' : 'cursor-default'
        } ${props.class || ''}`}
      >
        <Show
          when={fotoUrl()}
          fallback={
            <div class="w-full h-full bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center text-secondary-400 font-semibold">
              {props.nama.charAt(0).toUpperCase()}
            </div>
          }
        >
          <img
            src={fotoUrl()!}
            alt={props.nama}
            loading="lazy"
            class="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </Show>
      </button>

      <Modal show={showModal()} onClose={() => setShowModal(false)} title={props.nama} maxWidth="sm">
        <div class="flex flex-col items-center gap-3">
          <Show
            when={fotoUrl()}
            fallback={
              <div class="w-40 h-40 rounded-full bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center text-6xl font-bold text-secondary-400 border-4 border-secondary-200 dark:border-secondary-700">
                {props.nama.charAt(0).toUpperCase()}
              </div>
            }
          >
            <img
              src={fotoUrl()!}
              alt={props.nama}
              class="w-full max-w-xs max-h-[50vh] object-contain rounded-lg border border-secondary-200 dark:border-secondary-700"
            />
          </Show>
          <div class="text-center">
            <p class="font-semibold text-secondary-800 dark:text-white">{props.nama}</p>
            <Show when={props.nim}>
              <p class="text-sm text-secondary-500 dark:text-secondary-400 font-mono">{props.nim}</p>
            </Show>
          </div>
        </div>
      </Modal>
    </>
  );
}
