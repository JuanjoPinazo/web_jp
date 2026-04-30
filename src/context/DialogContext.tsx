'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/Button';

type DialogType = 'info' | 'success' | 'warning' | 'danger';

interface DialogOptions {
  title: string;
  message: ReactNode;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState extends DialogOptions {
  isOpen: boolean;
  isAlert: boolean;
  resolve: (value: boolean) => void;
}

interface DialogContextType {
  confirm: (options: DialogOptions | string) => Promise<boolean>;
  alert: (options: Omit<DialogOptions, 'cancelText'> | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  const confirm = useCallback((options: DialogOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        isAlert: false,
        resolve,
        ...(typeof options === 'string' ? { title: 'Confirmar acción', message: options } : options)
      });
    });
  }, []);

  const alert = useCallback((options: Omit<DialogOptions, 'cancelText'> | string): Promise<void> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        isAlert: true,
        resolve: () => resolve(),
        ...(typeof options === 'string' ? { title: 'Información', message: options } : options)
      });
    });
  }, []);

  const handleClose = (value: boolean) => {
    if (dialogState) {
      dialogState.resolve(value);
      setDialogState(prev => prev ? { ...prev, isOpen: false } : null);
      // Wait for animation to finish before removing from DOM
      setTimeout(() => setDialogState(null), 300);
    }
  };

  const getIcon = (type?: DialogType) => {
    switch (type) {
      case 'danger':
        return <XCircle className="text-red-500" size={32} />;
      case 'warning':
        return <AlertTriangle className="text-amber-500" size={32} />;
      case 'success':
        return <CheckCircle className="text-emerald-500" size={32} />;
      case 'info':
      default:
        return <Info className="text-blue-500" size={32} />;
    }
  };

  const getIconBg = (type?: DialogType) => {
    switch (type) {
      case 'danger':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const getConfirmButtonClass = (type?: DialogType) => {
    if (type === 'danger') {
      return 'bg-red-500 hover:bg-red-600 text-white border-transparent shadow-lg shadow-red-500/20';
    }
    return ''; // Defaults to Button component style
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      
      <AnimatePresence>
        {dialogState?.isOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => handleClose(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="relative w-full max-w-md bg-surface border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col"
            >
              <div className="p-6 sm:p-8 flex flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div className={cn("shrink-0 p-3 rounded-2xl border", getIconBg(dialogState.type))}>
                    {getIcon(dialogState.type)}
                  </div>
                  <button 
                    onClick={() => handleClose(false)}
                    className="p-2 rounded-full text-muted hover:text-white hover:bg-background transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black font-heading tracking-tight">{dialogState.title}</h3>
                  <div className="text-muted text-sm font-medium leading-relaxed">
                    {dialogState.message}
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
                  {!dialogState.isAlert && (
                    <button
                      onClick={() => handleClose(false)}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-muted hover:text-white hover:bg-background transition-all"
                    >
                      {dialogState.cancelText || 'Cancelar'}
                    </button>
                  )}
                  <Button
                    onClick={() => handleClose(true)}
                    className={cn("w-full sm:w-auto rounded-xl", getConfirmButtonClass(dialogState.type))}
                  >
                    {dialogState.confirmText || (dialogState.isAlert ? 'Entendido' : 'Aceptar')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
