import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Icon } from '@/components/Icon';

interface ModalProps {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeLabel?: string;
}

export function Modal({ title, onClose, footer, children, size = 'md', closeLabel }: ModalProps) {
  const fullScreen = size === 'full';
  const widthClass =
    fullScreen
      ? 'w-full h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-2rem)] max-w-none rounded-[24px] sm:rounded-[28px]'
      : size === 'sm'
        ? 'max-w-sm'
        : size === 'lg'
          ? 'max-w-2xl'
          : size === 'xl'
            ? 'max-w-4xl'
            : 'max-w-lg';

  return (
    <motion.div
      className={clsx(
        'fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm',
        fullScreen ? 'grid place-items-center p-2 sm:p-4' : 'grid place-items-center p-2 sm:p-4',
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
        className={clsx(
          'card w-full flex flex-col overflow-hidden min-h-0',
          widthClass,
          fullScreen ? 'border border-line shadow-pop' : 'max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]',
        )}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line bg-gradient-to-r from-brand-50/60 to-transparent">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-brand-600 font-bold">Schoolmate</p>
            <h2 className="font-display text-base sm:text-lg font-semibold leading-tight mt-1 truncate">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className={clsx(
              'shrink-0 h-9 rounded-xl border border-line bg-surface text-ink-400 hover:text-ink-900 hover:bg-muted transition-colors inline-flex items-center gap-1.5 px-3',
              closeLabel ? 'w-auto' : 'w-9 justify-center px-0',
            )}
            aria-label={closeLabel || 'Close modal'}
          >
            {closeLabel ? (
              <>
                <Icon name="arrow-right" size={14} className="rotate-180" />
                <span className="text-xs sm:text-sm font-semibold">{closeLabel}</span>
              </>
            ) : (
              '×'
            )}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 pb-6 sm:pb-8 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(248,250,252,0.98))]">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-line bg-surface/90 flex justify-end gap-2 flex-wrap">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
