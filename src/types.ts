/**
 * PhotoTriage Types and Interfaces
 */

export type PhotoStatus = 'kept' | 'rejected';

export type PhotoFormat = 'ARW' | 'CR3' | 'NEF' | 'DNG' | 'JPG' | 'PNG' | 'TIFF';

export interface ExifData {
  shutter: string;       // e.g. "1/1000s", "6.0s", "1/1250s"
  aperture: string;      // e.g. "f/2.8", "f/1.4", "f/4.0"
  iso: number;           // e.g. 100, 800, 3200
  focalLength: string;   // e.g. "16mm", "35mm", "85mm"
  lens: string;          // e.g. "FE 16-35 GM II", "FE 24-70mm GM II @ 35mm"
  camera: string;        // e.g. "Sony A1", "Canon R5", "Nikon Z9"
  dimensions: string;    // e.g. "9504 × 6336"
  megapixels: string;    // e.g. "61 MP"
  evShift?: string;      // e.g. "0.0 EV", "+0.33 EV", "+2.8 EV Over"
}

export interface PhotoEditState {
  brightness: number;
  contrast: number;
  saturation: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Photo {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  sizeFormatted: string;
  format: PhotoFormat;
  status: PhotoStatus;
  sharpnessScore: number;    // e.g. 98.4
  starRating: number;        // 0 to 5
  aiFlag?: string;           // e.g. "Eye-AF Lock", "Motion Blur", "+2.8 EV Over", "5 Stars"
  exif: ExifData;
  createdAt: number;
  updatedAt?: number;
  userId?: string;
  storagePath?: string;
  isLocalOnly?: boolean;
  editState?: PhotoEditState | null;
}


export type TriageFolder = 'all' | 'flagged' | 'rejected';
export type NavigationMode = 'gallery' | 'pre-round' | 'compare' | 'history-trash' | 'editor' | 'finalists' | 'export';
export type SortMode = 'capture-desc' | 'capture-asc' | 'sharpness' | 'iso' | 'filesize';

export interface IngestionProgress {
  active: boolean;
  totalFiles: number;
  processedFiles: number;
  percentage: number;
  source: string;
  bufferedBytes: number;
  totalBytes: number;
  speedMBs: number;
}

export interface SyncAction {
  id: string;
  type: 'upload' | 'update_status' | 'delete' | 'batch_update';
  payload: any;
  timestamp: number;
  synced: boolean;
}

export interface ComparisonDecision {
  leftId: string;
  rightId: string;
  winnerId: string;
  loserId: string;
  previousPendingPairs: [string, string][];
  previousWinners: string[];
  previousEliminatedIds: string[];
}

export interface ComparisonSession {
  isActive: boolean;
  roundNumber: number;
  initialIds: string[];
  pendingPairs: [string, string][];
  currentPair: [string, string] | null;
  winners: string[];
  eliminatedIds: string[];
  history: ComparisonDecision[];
}

export interface SessionInfo {
  id: string;
  title: string;
  date: string;
  usedStorageGB: number;
  totalStorageGB: number | null;
}
