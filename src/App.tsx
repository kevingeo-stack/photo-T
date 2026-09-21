import React, { useEffect, useState } from 'react';
import { AppController } from './controllers/AppController';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { GalleryUI } from './ui/GalleryUI';
import { PreRoundUI } from './ui/PreRoundUI';
import { ComparisonUI } from './ui/ComparisonUI';
import { HistoryTrashUI } from './ui/HistoryTrashUI';
import { EditorUI } from './ui/EditorUI';
import { FinalistsUI } from './ui/FinalistsUI';
import { ExportUI } from './ui/ExportUI';
import { ShortcutsModal } from './components/ShortcutsModal';
import { LoupeModal } from './components/LoupeModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { NavigationMode, Photo } from './types';

export const App: React.FC = () => {
  const controller = AppController.getInstance();
  const [currentMode, setCurrentMode] = useState<NavigationMode>(controller.getMode());
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(controller.isShortcutsModalOpen());
  const [inspectedPhoto, setInspectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    return controller.subscribe(() => {
      setCurrentMode(controller.getMode());
      setIsShortcutsOpen(controller.isShortcutsModalOpen());
    });
  }, [controller]);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-inter">
      {/* Top Application Header */}
      <Header />

      {/* Lateral Triage Navigation Sidebar */}
      <Sidebar />

      {/* Primary Dynamic Stage */}
      <main className="flex-1 flex flex-col">
        {currentMode === 'gallery' && (
          <GalleryUI onOpenLoupe={(photo) => setInspectedPhoto(photo)} />
        )}
        {currentMode === 'pre-round' && <PreRoundUI />}
        {currentMode === 'compare' && <ComparisonUI />}
        {currentMode === 'history-trash' && <HistoryTrashUI />}
        {currentMode === 'editor' && <EditorUI />}
        {currentMode === 'finalists' && <FinalistsUI />}
        {currentMode === 'export' && <ExportUI />}
      </main>

      {/* Modals & Overlays */}
      {isShortcutsOpen && <ShortcutsModal />}
      {inspectedPhoto && (
        <LoupeModal photo={inspectedPhoto} onClose={() => setInspectedPhoto(null)} />
      )}

      {/* Offline Status Badge */}
      <OfflineIndicator />
    </div>
  );
};

export default App;
