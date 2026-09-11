import React, { useEffect, useState } from 'react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-surface-container-high border border-primary/40 px-3 py-1.5 text-label-md font-medium text-on-surface shadow-2xl backdrop-blur-md">
      <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
      <span>Modo Sin Conexión — Cambios en cola (IndexedDB)</span>
    </div>
  );
};
