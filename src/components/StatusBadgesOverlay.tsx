import React from 'react';
import { getStatusEffectMeta } from '../utils/statusEffects.ts';
import { X } from 'lucide-react';

interface StatusBadgesOverlayProps {
  statusEffects: string[];
  isDM?: boolean;
  onRemoveStatus?: (statusKey: string) => void;
  onOpenPicker?: () => void;
}

export const StatusBadgesOverlay: React.FC<StatusBadgesOverlayProps> = ({
  statusEffects,
  isDM = false,
  onRemoveStatus,
  onOpenPicker,
}) => {
  if (!statusEffects || statusEffects.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 items-center max-w-full">
      {statusEffects.map((key) => {
        const meta = getStatusEffectMeta(key);

        return (
          <span
            key={key}
            title={`${meta.name}: ${meta.description}`}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border shadow-sm select-none transition-transform hover:scale-110 ${meta.badgeBg} ${meta.borderColor}`}
          >
            <span className="text-xs leading-none">{meta.icon}</span>
            <span className="truncate max-w-[65px]">{meta.name}</span>

            {isDM && onRemoveStatus && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveStatus(key);
                }}
                title={`Eliminar ${meta.name}`}
                aria-label={`Eliminar estado ${meta.name}`}
                className="hover:text-red-400 p-0.2 rounded"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
};
