import React from 'react';
import { OctopusProvider } from './context/OctopusContext';
import { TerminalProvider } from './context/TerminalContext';
import Octopus from './components/Octopus/Octopus';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <OctopusProvider>
      <TerminalProvider>
        <Octopus />
      </TerminalProvider>
    </OctopusProvider>
  );
};

export default App;
