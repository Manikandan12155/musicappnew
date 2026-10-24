import React from 'react';
import { useMusic } from '../context/MusicContext';
import { CheckCircle2 } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useMusic();

  if (!toastMessage) return null;

  return (
    <div className="space-toast-container">
      <div className="space-toast-pill">
        <CheckCircle2 size={18} className="toast-icon" />
        <span>{toastMessage}</span>
      </div>
    </div>
  );
};
