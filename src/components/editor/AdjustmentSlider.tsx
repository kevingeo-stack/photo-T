import React from 'react';

interface AdjustmentSliderProps {
  label: string;
  icon: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  formatValue?: (val: number) => string;
}

export const AdjustmentSlider: React.FC<AdjustmentSliderProps> = ({
  label,
  icon,
  value,
  min,
  max,
  onChange,
  formatValue
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="flex flex-col gap-2 w-full select-none">
      <div className="flex items-center justify-between">
        <label className="font-label-md font-semibold flex items-center gap-1.5 text-on-surface">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{icon}</span>
          {label}
        </label>
        <span className="font-mono text-label-sm text-primary bg-primary/10 px-2 py-0.5 rounded shadow-sm">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <div className="relative h-6 flex items-center group cursor-pointer"
           onPointerDown={(e) => {
             const slider = e.currentTarget;
             slider.setPointerCapture(e.pointerId);
             
             const updateValue = (clientX: number) => {
               const rect = slider.getBoundingClientRect();
               let newPercentage = (clientX - rect.left) / rect.width;
               newPercentage = Math.max(0, Math.min(1, newPercentage));
               onChange(Math.round(min + newPercentage * (max - min)));
             };
             
             updateValue(e.clientX);
             
             const onPointerMove = (moveEvent: React.PointerEvent) => {
               updateValue(moveEvent.clientX);
             };
             
             const onPointerUp = (upEvent: React.PointerEvent) => {
               // @ts-ignore
               slider.removeEventListener('pointermove', onPointerMove);
               // @ts-ignore
               slider.removeEventListener('pointerup', onPointerUp);
               slider.releasePointerCapture(upEvent.pointerId);
             };
             
             // @ts-ignore
             slider.addEventListener('pointermove', onPointerMove);
             // @ts-ignore
             slider.addEventListener('pointerup', onPointerUp);
           }}
      >
        <div className="absolute w-full h-1.5 bg-surface-container-highest rounded-full shadow-inner overflow-hidden">
          <div 
            className="h-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div 
          className="absolute w-4 h-4 bg-primary rounded-full shadow-md transition-transform group-hover:scale-125"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
};
