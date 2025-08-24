import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  isMobileStatusModalOpen: boolean;
  setIsMobileStatusModalOpen: (isOpen: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

function useModalContext() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  return context;
}

export { useModalContext };

interface ModalProviderProps {
  children: ReactNode;
}

function ModalProvider({ children }: ModalProviderProps) {
  const [isMobileStatusModalOpen, setIsMobileStatusModalOpen] = useState(false);

  return (
    <ModalContext.Provider value={{
      isMobileStatusModalOpen,
      setIsMobileStatusModalOpen,
    }}>
      {children}
    </ModalContext.Provider>
  );
}

export { ModalProvider };
