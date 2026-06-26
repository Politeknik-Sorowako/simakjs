import { JSX, Show } from 'solid-js';

interface ModalProps {
  show: boolean;
  title: string;
  onClose: () => void;
  children: JSX.Element;
}

export function Modal(props: ModalProps) {
  return (
    <Show when={props.show}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300">
        <div class="w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-transform duration-300 transform scale-100 flex flex-col gap-4 border border-gray-100">
          <div class="flex items-center justify-between border-b pb-3">
            <h3 class="text-lg font-bold text-gray-800">{props.title}</h3>
            <button
              onClick={props.onClose}
              class="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="max-h-[70vh] overflow-y-auto">
            {props.children}
          </div>
        </div>
      </div>
    </Show>
  );
}
