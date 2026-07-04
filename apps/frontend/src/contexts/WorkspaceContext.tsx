import { createContext, useContext, createSignal, JSX } from 'solid-js';

interface WorkspaceContextType {
  selectedProdiId: () => number | null;
  setSelectedProdiId: (id: number | null) => void;
  selectedPeriodeId: () => string | null;
  setSelectedPeriodeId: (id: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>();

export function WorkspaceProvider(props: { children: JSX.Element }) {
  // Load initial values from sessionStorage
  const cachedProdiId = sessionStorage.getItem('ws_prodi_id');
  const cachedPeriodeId = sessionStorage.getItem('ws_periode_id');

  const [selectedProdiId, setProdiIdState] = createSignal<number | null>(
    cachedProdiId ? parseInt(cachedProdiId) : null
  );
  const [selectedPeriodeId, setPeriodeIdState] = createSignal<string | null>(
    cachedPeriodeId || null
  );

  const setSelectedProdiId = (id: number | null) => {
    setProdiIdState(id);
    if (id === null) {
      sessionStorage.removeItem('ws_prodi_id');
    } else {
      sessionStorage.setItem('ws_prodi_id', id.toString());
    }
  };

  const setSelectedPeriodeId = (id: string | null) => {
    setPeriodeIdState(id);
    if (id === null) {
      sessionStorage.removeItem('ws_periode_id');
    } else {
      sessionStorage.setItem('ws_periode_id', id);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        selectedProdiId,
        setSelectedProdiId,
        selectedPeriodeId,
        setSelectedPeriodeId,
      }}
    >
      {props.children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
