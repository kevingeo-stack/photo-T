import React, { useRef, useState, useEffect } from 'react';

export interface CropState {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropOverlayProps {
  crop?: CropState;
  onChange: (crop: CropState) => void;
  isActive: boolean;
}

export const CropOverlay: React.FC<CropOverlayProps> = ({ crop, onChange, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Default to full image if no crop
  const currentCrop = crop || { x: 0, y: 0, width: 1, height: 1 };
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragContext, setDragContext] = useState<{
    type: 'move' | 'tl' | 'tr' | 'bl' | 'br';
    startX: number;
    startY: number;
    initialCrop: CropState;
  } | null>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !dragContext || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const dx = (e.clientX - dragContext.startX) / rect.width;
      const dy = (e.clientY - dragContext.startY) / rect.height;
      
      const { initialCrop, type } = dragContext;
      let newCrop = { ...initialCrop };
      
      if (type === 'move') {
        newCrop.x = Math.max(0, Math.min(1 - newCrop.width, initialCrop.x + dx));
        newCrop.y = Math.max(0, Math.min(1 - newCrop.height, initialCrop.y + dy));
      } else {
        if (type.includes('l')) {
          newCrop.x = Math.max(0, Math.min(initialCrop.x + initialCrop.width - 0.05, initialCrop.x + dx));
          newCrop.width = initialCrop.x + initialCrop.width - newCrop.x;
        }
        if (type.includes('r')) {
          const newRight = Math.max(newCrop.x + 0.05, Math.min(1, initialCrop.x + initialCrop.width + dx));
          newCrop.width = newRight - newCrop.x;
        }
        if (type.includes('t')) {
          newCrop.y = Math.max(0, Math.min(initialCrop.y + initialCrop.height - 0.05, initialCrop.y + dy));
          newCrop.height = initialCrop.y + initialCrop.height - newCrop.y;
        }
        if (type.includes('b')) {
          const newBottom = Math.max(newCrop.y + 0.05, Math.min(1, initialCrop.y + initialCrop.height + dy));
          newCrop.height = newBottom - newCrop.y;
        }
      }
      
      onChange(newCrop);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setDragContext(null);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dragContext, onChange]);

  if (!isActive) return null;

  const handlePointerDown = (type: typeof dragContext.type) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragContext({
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...currentCrop }
    });
  };

  const style = {
    left: `${currentCrop.x * 100}%`,
    top: `${currentCrop.y * 100}%`,
    width: `${currentCrop.width * 100}%`,
    height: `${currentCrop.height * 100}%`
  };

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-auto touch-none">
      {/* Dimmed background around crop area */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" style={{ clipPath: `polygon(0% 0%, 0% 100%, ${currentCrop.x * 100}% 100%, ${currentCrop.x * 100}% ${currentCrop.y * 100}%, ${(currentCrop.x + currentCrop.width) * 100}% ${currentCrop.y * 100}%, ${(currentCrop.x + currentCrop.width) * 100}% ${(currentCrop.y + currentCrop.height) * 100}%, ${currentCrop.x * 100}% ${(currentCrop.y + currentCrop.height) * 100}%, ${currentCrop.x * 100}% 100%, 100% 100%, 100% 0%)` }}></div>
      
      {/* Crop Box */}
      <div 
        className="absolute border-2 border-primary shadow-[0_0_0_1px_rgba(0,0,0,0.3)] cursor-move flex items-center justify-center"
        style={style}
        onPointerDown={handlePointerDown('move')}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none border-x border-white/30 w-1/3 mx-auto" />
        <div className="absolute inset-0 pointer-events-none border-y border-white/30 h-1/3 my-auto" />

        {/* Handles */}
        <div 
          className="absolute -top-2 -left-2 w-4 h-4 bg-primary border border-black/20 rounded-full cursor-nwse-resize"
          onPointerDown={handlePointerDown('tl')}
        />
        <div 
          className="absolute -top-2 -right-2 w-4 h-4 bg-primary border border-black/20 rounded-full cursor-nesw-resize"
          onPointerDown={handlePointerDown('tr')}
        />
        <div 
          className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary border border-black/20 rounded-full cursor-nesw-resize"
          onPointerDown={handlePointerDown('bl')}
        />
        <div 
          className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary border border-black/20 rounded-full cursor-nwse-resize"
          onPointerDown={handlePointerDown('br')}
        />
      </div>
    </div>
  );
};
