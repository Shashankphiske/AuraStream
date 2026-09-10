import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidths[maxWidth]} max-h-[90dvh] flex flex-col rounded-2xl bg-[#0e1222] border border-white/10 p-4 sm:p-6 shadow-2xl z-10`}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-32 bg-violet-600/20 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/5 flex-shrink-0">
          {title ? (
            <h3 className="text-base sm:text-lg font-bold text-white tracking-wide truncate pr-2">{title}</h3>
          ) : <div />}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 sm:p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 sm:mt-4 overflow-y-auto overscroll-contain flex-1 min-h-0 pr-1 -mr-1">
          {children}
        </div>
      </div>
    </div>
  );
};
