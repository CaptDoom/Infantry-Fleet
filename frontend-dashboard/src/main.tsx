import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppEnterprise } from './AppEnterprise';
import './index.css';

function Root() {
  const [mode, setMode] = useState<'fleet' | 'enterprise'>(() => {
    return (localStorage.getItem('app-mode') as 'fleet' | 'enterprise') || 'enterprise';
  });

  const toggleMode = () => {
    const newMode = mode === 'fleet' ? 'enterprise' : 'fleet';
    localStorage.setItem('app-mode', newMode);
    setMode(newMode);
  };

  return (
    <React.StrictMode>
      {mode === 'fleet' ? (
        <div>
          <button
            onClick={toggleMode}
            className="fixed top-2 right-2 z-[999] px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            Switch to Enterprise Dashboard
          </button>
          <App />
        </div>
      ) : (
        <div>
          <button
            onClick={toggleMode}
            className="fixed top-2 right-2 z-[999] px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            Switch to Fleet Management
          </button>
          <AppEnterprise />
        </div>
      )}
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
