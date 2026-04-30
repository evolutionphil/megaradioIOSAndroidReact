import { createContext, useContext, useState } from 'react';

interface HelpContextType {
  helpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
}

var HelpContext = createContext<HelpContextType>({
  helpOpen: false,
  openHelp: function() {},
  closeHelp: function() {},
});

export function HelpProvider({ children }: { children: React.ReactNode }) {
  var [helpOpen, setHelpOpen] = useState(false);
  return (
    <HelpContext.Provider value={{
      helpOpen: helpOpen,
      openHelp: function() { setHelpOpen(true); },
      closeHelp: function() { setHelpOpen(false); },
    }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  return useContext(HelpContext);
}
