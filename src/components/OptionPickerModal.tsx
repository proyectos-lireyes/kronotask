import React from 'react';
import { X, Check } from 'lucide-react';

export interface PickerOption {
  id: string | number;
  label: string;
  description?: string;
  color?: string;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface OptionPickerModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  options: PickerOption[];
  selectedValue: string | number;
  onSelect: (id: any) => void;
  onClose: () => void;
}

export const OptionPickerModal: React.FC<OptionPickerModalProps> = ({
  isOpen,
  title,
  subtitle,
  icon: HeaderIcon,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            {HeaderIcon && (
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <HeaderIcon className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-snug">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-3 space-y-1.5 overflow-y-auto divide-y divide-slate-100/60">
          {options.map((opt) => {
            const isSelected = opt.id === selectedValue;
            const OptIcon = opt.icon;

            return (
              <button
                key={String(opt.id)}
                type="button"
                onClick={() => {
                  onSelect(opt.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-400 shadow-2xs font-bold ring-1 ring-blue-300'
                    : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {opt.color && (
                    <span
                      className="w-3.5 h-3.5 rounded-md shrink-0 shadow-2xs"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  {OptIcon && <OptIcon className="w-4 h-4 text-slate-500 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs ${isSelected ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                      {opt.label}
                    </p>
                    {opt.description && (
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{opt.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {opt.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-600">
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
