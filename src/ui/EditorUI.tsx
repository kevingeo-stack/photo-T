import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { PhotoManager } from '../services/PhotoManager';
import { AppController } from '../controllers/AppController';
import { Photo, PhotoEditState } from '../types';
import { usePhotoOriginal } from '../hooks/usePhotoOriginal';
import { usePhotoThumbnail } from '../hooks/usePhotoThumbnail';
import { AdjustmentSlider } from '../components/editor/AdjustmentSlider';
import { ImagePreview } from '../components/editor/ImagePreview';

// ─── EditorThumbnail ────────────────────────────────────────────────────────

interface EditorThumbnailProps {
  photo: Photo;
  isActive: boolean;
  onClick: () => void;
}

const EditorThumbnail: React.FC<EditorThumbnailProps> = ({ photo, isActive, onClick }) => {
  const { url: thumbUrl, isLoading } = usePhotoThumbnail(photo.id);

  return (
    <button
      onClick={onClick}
      className={`group relative shrink-0 md:shrink flex items-center gap-3 p-1.5 md:p-2.5 rounded-xl border transition-all duration-200 text-left w-24 md:w-full ${
        isActive
          ? 'bg-primary/15 border-primary/60 ring-1 ring-primary/40 shadow-sm'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      }`}
    >
      <div className="w-full md:w-16 h-full md:h-12 flex-shrink-0 bg-black/20 rounded-lg overflow-hidden flex items-center justify-center">
        {isLoading ? (
          <span className="material-symbols-outlined text-[16px] text-white/30 animate-spin">sync</span>
        ) : thumbUrl ? (
          <img
            src={thumbUrl}
            alt={photo.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="material-symbols-outlined text-[16px] text-red-400">broken_image</span>
        )}
      </div>
      <div className="hidden md:block flex-1 min-w-0">
        <p className="text-xs font-medium truncate text-white/80 leading-tight">{photo.name}</p>
        <p className="text-[10px] text-white/40 mt-0.5 truncate">
          {photo.format} · {photo.sizeFormatted}
        </p>
        {photo.editState && (
          <span className="inline-block mt-1 px-1.5 py-0.5 bg-primary/25 text-primary text-[9px] rounded-full font-semibold tracking-wide">
            EDITADA
          </span>
        )}
      </div>
    </button>
  );
};

// ─── RenameInput ─────────────────────────────────────────────────────────────

interface RenameInputProps {
  photoId: string;
  currentName: string;
  onRename: (newName: string) => Promise<void>;
}

const RenameInput: React.FC<RenameInputProps> = ({ photoId, currentName, onRename }) => {
  // displayName tracks what we show in the button (updates after save succeeds)
  const [displayName, setDisplayName] = useState(currentName);
  const [isEditing, setIsEditing] = useState(false);
  // draftName is what the user is typing — completely independent
  const [draftName, setDraftName] = useState(currentName);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Only reset when PHOTO changes (photoId changes), not when name changes due to a save
  const prevPhotoIdRef = useRef(photoId);
  useEffect(() => {
    if (prevPhotoIdRef.current !== photoId) {
      prevPhotoIdRef.current = photoId;
      setDisplayName(currentName);
      setDraftName(currentName);
      setIsEditing(false);
      setErrorMsg('');
    }
  }, [photoId, currentName]);

  // Auto-focus and pre-select filename without extension when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const lastDot = draftName.lastIndexOf('.');
      if (lastDot > 0) {
        inputRef.current.setSelectionRange(0, lastDot);
      } else {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleEdit = () => {
    setDraftName(displayName);
    setErrorMsg('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraftName(displayName);
    setErrorMsg('');
  };

  const handleSave = async () => {
    const finalName = draftName.trim();
    if (!finalName) {
      setErrorMsg('El nombre no puede estar vacío.');
      return;
    }
    if (finalName === displayName) {
      setIsEditing(false);
      setErrorMsg('');
      return;
    }
    if (/[<>:"/\\|?*]/.test(finalName)) {
      setErrorMsg('Nombre contiene caracteres no permitidos.');
      return;
    }

    // Auto-append original extension if user didn't type it
    const ext = displayName.includes('.') ? displayName.substring(displayName.lastIndexOf('.')) : '';
    let processedName = finalName;
    if (ext && !processedName.toLowerCase().endsWith(ext.toLowerCase())) {
      processedName += ext;
    }

    // Close editing first, update display name optimistically
    setIsEditing(false);
    setErrorMsg('');
    setDisplayName(processedName);
    setDraftName(processedName);

    // Then persist (in background)
    try {
      await onRename(processedName);
    } catch {
      // Revert display name on failure
      setDisplayName(displayName);
      setDraftName(displayName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 min-w-0" data-testid="rename-display">
        <h1 className="text-sm font-medium text-white truncate max-w-[160px] sm:max-w-[280px]">{displayName}</h1>
        <button
          onClick={handleEdit}
          className="flex-shrink-0 p-1.5 rounded-lg bg-white/8 hover:bg-white/15 active:bg-white/20 transition-colors"
          title="Cambiar nombre"
          aria-label="Cambiar nombre"
          data-testid="rename-button"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px] text-primary">edit</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2" data-testid="rename-editing">
      <div className="relative">
        <input
          ref={inputRef}
          value={draftName}
          onChange={(e) => { setDraftName(e.target.value); setErrorMsg(''); }}
          onKeyDown={handleKeyDown}
          className="bg-[#0e0e11] text-sm text-white px-3 py-1.5 border border-primary/60 rounded-lg outline-none focus:border-primary w-[150px] sm:w-[230px]"
          data-testid="rename-input"
          autoComplete="off"
          spellCheck={false}
        />
        {errorMsg && (
          <span className="absolute top-[110%] left-0 z-50 text-[10px] text-red-400 whitespace-nowrap bg-[#1a1a1f] px-2 py-1 rounded-lg border border-red-500/30 shadow-lg">
            {errorMsg}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={handleCancel}
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Cancelar (Escape)"
          data-testid="rename-cancel"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="p-1.5 rounded-lg text-emerald-400/80 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          title="Guardar (Enter)"
          data-testid="rename-save"
        >
          <span className="material-symbols-outlined text-[18px]">check</span>
        </button>
      </div>
    </div>
  );
};

// ─── DeleteConfirmDialog ──────────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  photo: Photo;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({ photo, onConfirm, onCancel }) => (
  <div
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-dialog-title"
    data-testid="delete-confirm-dialog"
  >
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

    {/* Card */}
    <div className="relative z-10 w-full max-w-sm bg-[#1a1a1f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-white/8">
        <div className="flex items-center gap-3 mb-1">
          <span className="material-symbols-outlined text-[22px] text-red-400">delete_forever</span>
          <h2 id="delete-dialog-title" className="text-base font-semibold text-white">
            ¿Eliminar esta foto?
          </h2>
        </div>
        <p className="text-sm text-white/50 mt-2 leading-relaxed">
          <span className="font-medium text-white/70">{photo.name}</span> será eliminada de PhotoT. Esta acción no se puede deshacer.
        </p>
      </div>
      <div className="px-6 py-4 flex gap-3">
        <button
          id="cancel-delete-btn"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
          data-testid="delete-cancel-btn"
        >
          Cancelar
        </button>
        <button
          id="confirm-delete-btn"
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-bold transition-all"
          data-testid="delete-confirm-btn"
        >
          Eliminar
        </button>
      </div>
    </div>
  </div>
);

// ─── SaveDialog ──────────────────────────────────────────────────────────────

type SaveStrategy = 'copy' | 'replace';

interface SaveDialogProps {
  photoName: string;
  onChoose: (strategy: SaveStrategy) => void;
  onCancel: () => void;
}

const SaveDialog: React.FC<SaveDialogProps> = ({ photoName, onChoose, onCancel }) => {
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-[#1a1a1f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {!confirming ? (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/8">
              <h2 id="save-dialog-title" className="text-base font-semibold text-white">
                Guardar cambios
              </h2>
              <p className="text-sm text-white/50 mt-1 truncate">{photoName}</p>
            </div>

            <div className="px-6 pt-4 pb-2">
              <p className="text-sm text-white/60">¿Cómo quieres guardar esta edición?</p>
            </div>

            <div className="px-6 pb-6 flex flex-col gap-3 mt-2">
              {/* Save as copy */}
              <button
                id="save-as-copy-btn"
                onClick={() => onChoose('copy')}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/15 hover:border-primary/40 transition-all text-left group"
              >
                <span className="material-symbols-outlined text-[22px] text-primary mt-0.5 shrink-0">file_copy</span>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors">
                    Guardar como copia
                  </p>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                    Conserva la foto original y crea una nueva foto con los cambios.
                  </p>
                </div>
              </button>

              {/* Replace */}
              <button
                id="replace-photo-btn"
                onClick={() => setConfirming(true)}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-amber-500/15 hover:border-amber-500/40 transition-all text-left group"
              >
                <span className="material-symbols-outlined text-[22px] text-amber-400 mt-0.5 shrink-0">autorenew</span>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
                    Reemplazar esta foto
                  </p>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                    Actualiza esta foto en tu colección con los cambios realizados.
                  </p>
                </div>
              </button>

              {/* Cancel */}
              <button
                id="cancel-save-btn"
                onClick={onCancel}
                className="w-full py-2.5 rounded-xl text-white/60 hover:text-white border border-white/10 hover:bg-white/5 text-sm font-medium transition-all"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Replace confirmation */}
            <div className="px-6 pt-6 pb-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[22px] text-amber-400">warning</span>
                <h2 id="save-dialog-title" className="text-base font-semibold text-white">
                  ¿Reemplazar esta foto?
                </h2>
              </div>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">
                Los cambios sustituirán la versión actual de esta foto. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="px-6 py-5 flex gap-3">
              <button
                id="cancel-replace-btn"
                onClick={() => setConfirming(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                id="confirm-replace-btn"
                onClick={() => onChoose('replace')}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-all"
              >
                Reemplazar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_EDIT_STATE: PhotoEditState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  crop: { x: 0, y: 0, width: 1, height: 1 }
};

function editStateChanged(a: PhotoEditState, b: PhotoEditState): boolean {
  return (
    a.brightness !== b.brightness ||
    a.contrast !== b.contrast ||
    a.saturation !== b.saturation ||
    JSON.stringify(a.crop) !== JSON.stringify(b.crop)
  );
}

// ─── EditorUI ────────────────────────────────────────────────────────────────

export const EditorUI: React.FC = () => {
  const photoManager = PhotoManager.getInstance();
  const appController = AppController.getInstance();

  // Use a version counter to force re-render on photo changes, avoiding
  // stale references from object mutation in PhotoManager.
  const [, forceUpdate] = useState(0);
  const allPhotosRef = useRef<Photo[]>(photoManager.getPhotos());

  const finalIds = useRef<string[]>(appController.getFinalSelection());
  const [activeFinalIds, setActiveFinalIds] = useState<string[]>(() => appController.getFinalSelection());

  // photosToEdit: always computed fresh from the latest photo data
  const photosToEdit = useMemo(
    () => {
      const photos = allPhotosRef.current;
      return activeFinalIds
        .map(id => photos.find(p => p.id === id))
        .filter((p): p is Photo => p !== undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeFinalIds, forceUpdate]
  );

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const safeIndex = Math.min(activeIndex, Math.max(0, photosToEdit.length - 1));
  const currentPhoto = photosToEdit[safeIndex] ?? null;

  // Load the original of the active photo only
  const { url: originalUrl, isLoading, error } = usePhotoOriginal(currentPhoto?.id ?? '');

  // Local editor state (unsaved)
  const [localEditState, setLocalEditState] = useState<PhotoEditState>(DEFAULT_EDIT_STATE);
  const [isCropping, setIsCropping] = useState(false);

  // UI states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('Guardado');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to photo changes — force a new reference so React sees the diff
  useEffect(() => {
    const unsub = photoManager.subscribe(() => {
      allPhotosRef.current = [...photoManager.getPhotos()]; // fresh shallow copy forces referential change
      forceUpdate(n => n + 1);
    });
    return unsub;
  }, [photoManager]);

  // Load edit state when switching photos
  useEffect(() => {
    if (currentPhoto) {
      setLocalEditState(
        currentPhoto.editState
          ? { ...DEFAULT_EDIT_STATE, ...currentPhoto.editState }
          : { ...DEFAULT_EDIT_STATE }
      );
      setIsCropping(false);
      setSaveError(null);
    }
  }, [currentPhoto?.id]);

  // Determine if there are unsaved changes
  const persistedState: PhotoEditState = currentPhoto?.editState
    ? { ...DEFAULT_EDIT_STATE, ...currentPhoto.editState }
    : { ...DEFAULT_EDIT_STATE };
  const hasChanges = editStateChanged(localEditState, persistedState);

  const handleUpdate = (key: keyof PhotoEditState, value: any) => {
    setLocalEditState(prev => ({ ...prev, [key]: value }));
  };

  const showFeedback = useCallback((msg: string = 'Guardado') => {
    setFeedbackMessage(msg);
    setSavedFeedback(true);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setSavedFeedback(false), 2500);
  }, []);

  // ── Rename ──────────────────────────────────────────────────────────────────
  const handleRename = async (newName: string) => {
    if (!currentPhoto || newName === currentPhoto.name) return;
    try {
      await photoManager.updatePhotoDetails(currentPhoto.id, { name: newName });
      showFeedback('Nombre actualizado');
    } catch (err) {
      console.error('[EditorUI] Failed to rename photo', err);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!currentPhoto) return;
    const deletedId = currentPhoto.id;
    setShowDeleteDialog(false);

    // Remove from AppController final selection
    const newFinalIds = activeFinalIds.filter(id => id !== deletedId);
    setActiveFinalIds(newFinalIds);
    finalIds.current = newFinalIds;
    appController.setFinalSelection(newFinalIds);

    // Adjust active index before deletion
    const newIndex = Math.min(safeIndex, Math.max(0, newFinalIds.length - 1));
    setActiveIndex(newIndex);

    // Delete from PhotoManager (IndexedDB + sync queue)
    try {
      await photoManager.deletePhoto(deletedId);
    } catch (err) {
      console.error('[EditorUI] Failed to delete photo', err);
    }

    // If no photos left, exit editor
    if (newFinalIds.length === 0) {
      appController.setMode('gallery');
    }
  };

  // ── Restore ─────────────────────────────────────────────────────────────────
  const handleRestore = () => {
    if (!currentPhoto) return;
    setLocalEditState(
      currentPhoto.editState
        ? { ...DEFAULT_EDIT_STATE, ...currentPhoto.editState }
        : { ...DEFAULT_EDIT_STATE }
    );
    setIsCropping(false);
  };

  // ── Remove edits ─────────────────────────────────────────────────────────────
  const handleRemoveEdits = async () => {
    if (!currentPhoto) return;
    const ok = window.confirm('¿Quitar todas las ediciones guardadas de esta foto?');
    if (!ok) return;
    await photoManager.updatePhotoDetails(currentPhoto.id, { editState: null });
    setLocalEditState({ ...DEFAULT_EDIT_STATE });
  };

  // ── Save dialog callback ─────────────────────────────────────────────────────
  const handleSaveChosen = async (strategy: 'copy' | 'replace') => {
    if (!currentPhoto) return;
    setShowSaveDialog(false);
    setIsSaving(true);
    setSaveError(null);

    try {
      if (strategy === 'copy') {
        await photoManager.savePhotoCopy(currentPhoto.id, localEditState);
      } else {
        await photoManager.replacePhotoWithEdits(currentPhoto.id, localEditState);
        setLocalEditState({ ...DEFAULT_EDIT_STATE, ...localEditState });
      }
      showFeedback('Cambios guardados');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (photosToEdit.length === 0) {
    return (
      <div className="flex-1 min-h-screen pl-0 md:pl-64 pt-14 pb-16 bg-[#0e0e11] text-white flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-outlined text-[48px] text-white/20 mb-4 block">image_not_supported</span>
          <h2 className="text-lg font-semibold text-white mb-2">No hay fotos seleccionadas para editar</h2>
          <p className="text-sm text-white/50 mb-6">Termina una ronda y selecciona tus fotos finales primero.</p>
          <button
            onClick={() => appController.setMode('gallery')}
            className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Volver a la galería
          </button>
        </div>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 h-screen pl-0 md:pl-64 pt-14 flex flex-col bg-[#0e0e11] text-white overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-white/8 px-4 md:px-6 flex items-center justify-between shrink-0 bg-[#141418]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => appController.setMode('gallery')}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm shrink-0"
            title="Volver a la galería"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="hidden sm:inline">Galería</span>
          </button>
          <span className="text-white/20 text-lg shrink-0">/</span>
          {currentPhoto && (
            <RenameInput photoId={currentPhoto.id} currentName={currentPhoto.name} onRename={handleRename} />
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-white/40 hidden sm:block">
            {safeIndex + 1} de {photosToEdit.length}
          </span>

          {/* Save feedback */}
          {savedFeedback && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium" data-testid="saved-feedback">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              {feedbackMessage}
            </span>
          )}

          {/* Export button */}
          <button
            onClick={() => appController.openExportView()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-white/10 bg-white/5 hover:bg-white/10 text-white"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">output</span>
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* Save button */}
          <button
            id="save-changes-btn"
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-35 disabled:cursor-not-allowed bg-primary text-on-primary hover:bg-primary/90 active:scale-95 shadow-md shadow-primary/20"
          >
            {isSaving ? (
              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">save</span>
            )}
            {isSaving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* Left sidebar: photo strip */}
        <aside className="w-full md:w-64 h-32 md:h-full border-b md:border-b-0 md:border-r border-white/8 bg-[#141418] flex flex-col shrink-0 overflow-hidden">
          <div className="hidden md:block px-4 pt-4 pb-3 border-b border-white/8">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30">
              Selección Final
            </p>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 flex md:flex-col gap-2 scrollbar-thin scrollbar-thumb-white/10">
            {photosToEdit.map((photo, index) => (
              <EditorThumbnail
                key={photo.id}
                photo={photo}
                isActive={safeIndex === index}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </aside>

        {/* Center: preview */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-[#0e0e11]">
          {/* Error/preview area */}
          <div className="flex-1 p-4 md:p-6 flex flex-col min-h-0">
            <div className="flex-1 flex items-center justify-center min-h-0">
              {error ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="material-symbols-outlined text-[40px] text-red-400/60">broken_image</span>
                  <p className="text-sm text-white/40">Vista previa no disponible</p>
                  {currentPhoto?.format && !['JPG', 'JPEG', 'PNG', 'WEBP'].includes(currentPhoto.format) && (
                    <p className="text-xs text-white/30 max-w-xs">
                      Los archivos {currentPhoto.format} no se pueden previsualizar directamente en el navegador.
                    </p>
                  )}
                </div>
              ) : (
                <ImagePreview
                  url={originalUrl}
                  editState={localEditState}
                  onCropChange={(c) => handleUpdate('crop', c)}
                  isCropping={isCropping}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* Crop toggle */}
            {!error && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsCropping(!isCropping)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    isCropping
                      ? 'bg-primary text-on-primary border-primary shadow-md'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">crop</span>
                  {isCropping ? 'Cerrar recorte' : 'Recortar'}
                </button>
              </div>
            )}
          </div>

          {/* Error message */}
          {saveError && (
            <div className="mx-4 mb-4 flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {saveError}
            </div>
          )}
        </main>

        {/* Right panel: controls */}
        <aside className="w-full md:w-72 border-t md:border-t-0 md:border-l border-white/8 bg-[#141418] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 flex flex-col gap-6 flex-1">

            {/* Section: Color adjustments */}
            <section>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/30 mb-4">
                Ajustes de color
              </p>
              <div className="flex flex-col gap-5">
                <AdjustmentSlider
                  label="Brillo"
                  icon="brightness_6"
                  value={localEditState.brightness}
                  min={0}
                  max={200}
                  onChange={(v) => handleUpdate('brightness', v)}
                  formatValue={(v) => `${v}%`}
                />
                <AdjustmentSlider
                  label="Contraste"
                  icon="contrast"
                  value={localEditState.contrast}
                  min={0}
                  max={200}
                  onChange={(v) => handleUpdate('contrast', v)}
                  formatValue={(v) => `${v}%`}
                />
                <AdjustmentSlider
                  label="Saturación"
                  icon="palette"
                  value={localEditState.saturation}
                  min={0}
                  max={200}
                  onChange={(v) => handleUpdate('saturation', v)}
                  formatValue={(v) => `${v}%`}
                />
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-white/8" />

            {/* Section: Actions */}
            <section className="flex flex-col gap-2.5">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/30 mb-1">
                Acciones
              </p>

              {/* Save changes (primary) */}
              <button
                id="save-changes-panel-btn"
                onClick={() => setShowSaveDialog(true)}
                disabled={!hasChanges || isSaving}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-xl font-semibold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed text-sm"
              >
                {isSaving ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">save</span>
                )}
                {isSaving ? 'Guardando…' : 'Guardar cambios'}
              </button>

              {/* Restore (secondary) */}
              <button
                id="restore-changes-btn"
                onClick={handleRestore}
                disabled={!hasChanges}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium border border-white/10 text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
                Restaurar cambios
              </button>

              {/* Remove edits (destructive, only if persisted state exists) */}
              {currentPhoto?.editState && (
                <button
                  id="remove-edits-btn"
                  onClick={handleRemoveEdits}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/8 border border-amber-500/10 hover:border-amber-500/25 transition-all text-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                  Quitar edición
                </button>
              )}

              {/* Separator */}
              <div className="border-t border-white/8 mt-1" />

              {/* Delete photo (destructive) */}
              <button
                id="delete-photo-btn"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/8 border border-red-500/10 hover:border-red-500/25 transition-all text-sm"
                data-testid="delete-photo-btn"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Eliminar foto
              </button>
            </section>

          </div>

          {/* Footer info */}
          {currentPhoto && (
            <div className="px-5 py-4 border-t border-white/8">
              <p className="text-[10px] text-white/25 leading-relaxed">
                {currentPhoto.format} · {currentPhoto.sizeFormatted}
                {currentPhoto.exif?.camera && ` · ${currentPhoto.exif.camera}`}
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Save dialog */}
      {showSaveDialog && currentPhoto && (
        <SaveDialog
          photoName={currentPhoto.name}
          onChoose={handleSaveChosen}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}

      {/* Delete confirm dialog */}
      {showDeleteDialog && currentPhoto && (
        <DeleteConfirmDialog
          photo={currentPhoto}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
};
