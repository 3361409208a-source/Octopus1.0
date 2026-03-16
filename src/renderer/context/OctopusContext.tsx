import React, { createContext, useContext, useState, useCallback } from 'react';
import { OctopusState } from '../../shared/types';

interface OctopusContextType {
  state: OctopusState;
  setPosition: (x: number, y: number) => void;
  toggleExpanded: () => void;
  setTheme: (theme: OctopusState['theme']) => void;
  setName: (name: string) => void;
}

const defaultState: OctopusState = {
  name: '小章鱼',
  position: { x: 100, y: 100 },
  isExpanded: true,
  theme: 'default',
};

const OctopusContext = createContext<OctopusContextType | null>(null);

export const OctopusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<OctopusState>(defaultState);

  const setPosition = useCallback((x: number, y: number) => {
    setState((prev) => ({ ...prev, position: { x, y } }));
  }, []);

  const toggleExpanded = useCallback(() => {
    setState((prev) => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  const setTheme = useCallback((theme: OctopusState['theme']) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const setName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, name }));
  }, []);

  return (
    <OctopusContext.Provider
      value={{ state, setPosition, toggleExpanded, setTheme, setName }}
    >
      {children}
    </OctopusContext.Provider>
  );
};

export const useOctopus = (): OctopusContextType => {
  const context = useContext(OctopusContext);
  if (!context) {
    throw new Error('useOctopus must be used within OctopusProvider');
  }
  return context;
};
