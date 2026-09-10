import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
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

  // Lock body scroll when modal is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidths[maxWidth]} my-auto max-h-[90dvh] sm:max-h-[85vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[#0c0f1d] border border-white/10 p-3.5 sm:p-6 shadow-2xl z-10 overflow-hidden`}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-32 bg-violet-600/20 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2.5 sm:pb-3.5 border-b border-white/10 flex-shrink-0">
          {title ? (
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-wide truncate pr-2">
              {title}
            </h3>
          ) : <div />}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 sm:p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="mt-2.5 sm:mt-4 overflow-y-auto overscroll-contain flex-1 min-h-0 pr-1 -mr-1 custom-scrollbar">
          {children}
        </div>

        {/* Optional Pinned Modal Footer */}
        {footer && (
          <div className="pt-3 pb-0.5 mt-2.5 border-t border-white/10 flex-shrink-0 flex items-center justify-end gap-2.5 z-20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

