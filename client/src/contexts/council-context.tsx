import { createContext, useContext, useState, type ReactNode } from "react";

type CouncilContextType = {
  isOpen: boolean;
  prefill: string;
  openCouncil: (prefill?: string) => void;
  closeCouncil: () => void;
};

const CouncilContext = createContext<CouncilContextType>({
  isOpen: false,
  prefill: "",
  openCouncil: () => {},
  closeCouncil: () => {},
});

export function CouncilProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState("");

  const openCouncil = (text = "") => {
    setPrefill(text);
    setIsOpen(true);
  };

  const closeCouncil = () => setIsOpen(false);

  return (
    <CouncilContext.Provider value={{ isOpen, prefill, openCouncil, closeCouncil }}>
      {children}
    </CouncilContext.Provider>
  );
}

export const useCouncil = () => useContext(CouncilContext);
