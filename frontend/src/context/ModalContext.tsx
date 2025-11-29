import { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  isMonitorModalOpen: boolean;
  setIsMonitorModalOpen: (open: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isMonitorModalOpen, setIsMonitorModalOpen] = useState(false);

  return (
    <ModalContext.Provider value={{ isMonitorModalOpen, setIsMonitorModalOpen }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

