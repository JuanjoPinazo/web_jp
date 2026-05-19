'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { RefreshCw, X, Info, ShieldAlert, Cpu } from 'lucide-react';

interface VersionInfo {
  version: string;
  buildTime: string;
}

export function PwaUpdateManager() {
  const { session } = useAuth();
  const isAdmin = session?.user?.role === 'admin';

  const [hasUpdate, setHasUpdate] = useState(false);
  const [checking, setChecking] = useState(false);
  const [swStatus, setSwStatus] = useState<'unsupported' | 'checking' | 'active' | 'waiting' | 'installing' | 'error'>('checking');
  const [serverVersion, setServerVersion] = useState<VersionInfo | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [manualCheckResult, setManualCheckResult] = useState<string | null>(null);

  const localVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
  const localBuildTime = process.env.NEXT_PUBLIC_BUILD_TIME || '';

  // Check server version endpoint
  const checkVersion = useCallback(async (isManual = false) => {
    setChecking(true);
    setManualCheckResult(null);
    try {
      const res = await fetch('/api/version', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch version from server');
      const data: VersionInfo = await res.json();
      setServerVersion(data);

      const isDifferent = 
        data.version !== localVersion || 
        (localBuildTime && data.buildTime !== localBuildTime);

      if (isDifferent) {
        console.log('[PWA Update] Version mismatch detected. Server:', data, 'Local:', { version: localVersion, buildTime: localBuildTime });
        
        // Tell the service worker to fetch updates from the server
        if (registration) {
          await registration.update();
        }
        
        if (isManual) {
          setManualCheckResult('Nueva actualización encontrada en el servidor. Descargando...');
        }
      } else {
        if (isManual) {
          setManualCheckResult('Tu aplicación ya está actualizada a la última versión.');
        }
      }
    } catch (err) {
      console.error('[PWA Update] Error checking version:', err);
      if (isManual) {
        setManualCheckResult('Error al conectar con el servidor de versiones.');
      }
    } finally {
      setChecking(false);
    }
  }, [localVersion, localBuildTime, registration]);

  // Handle actual update process
  const triggerUpdate = async () => {
    try {
      console.log('[PWA Update] Cleaning caches and activating new Service Worker...');
      
      // 1. Send SKIP_WAITING to the waiting service worker
      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      } else if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 2. Clear all browser caches
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }

      // 3. Clear technical local storage and session storage keys, preserving credentials
      try {
        sessionStorage.clear();
        const keysToKeep = ['theme_preference'];
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !keysToKeep.includes(key) && !key.startsWith('sb-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (storageErr) {
        console.error('[PWA Update] Failed to clear technical local storage:', storageErr);
      }

      // 4. Force reload page
      window.location.reload();
    } catch (err) {
      console.error('[PWA Update] Failed to complete update:', err);
    }
  };

  // Monitor service worker lifecycle
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setSwStatus('unsupported');
      return;
    }

    const handleControllerChange = () => {
      // Reload page once the new Service Worker has taken control
      console.log('[PWA Update] Controller changed. Reloading page...');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const getRegistration = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          setRegistration(reg);

          // Check if there is a waiting worker already
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setHasUpdate(true);
            setSwStatus('waiting');
          } else if (reg.installing) {
            setSwStatus('installing');
          } else if (reg.active) {
            setSwStatus('active');
          }

          // Listen for new installing service workers
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (!installing) return;
            setSwStatus('installing');

            installing.onstatechange = () => {
              if (installing.state === 'installed') {
                setWaitingWorker(installing);
                setHasUpdate(true);
                setSwStatus('waiting');
              } else if (installing.state === 'activated') {
                setSwStatus('active');
              }
            };
          };
        }
      } catch (err) {
        console.error('[PWA Update] Error getting service worker registration:', err);
        setSwStatus('error');
      }
    };

    getRegistration();

    // Check version on startup
    checkVersion();

    // Setup periodic checks (every 5 minutes)
    const checkInterval = setInterval(() => {
      checkVersion();
    }, 5 * 60 * 1000);

    // Check version on window focus
    const handleFocus = () => checkVersion();
    window.addEventListener('focus', handleFocus);

    // Listen to manual update events dispatched by UI buttons (e.g. Profile)
    const handleManualCheck = (e: Event) => {
      const customEvent = e as CustomEvent;
      const isManual = customEvent.detail?.manual || false;
      checkVersion(isManual);
    };

    window.addEventListener('pwa-check-update', handleManualCheck);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pwa-check-update', handleManualCheck);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [checkVersion]);

  // Close manual update message banner
  const closeManualResult = () => setManualCheckResult(null);

  return (
    <>
      {/* Toast Alert for Manual Check Result */}
      {manualCheckResult && (
        <div className="fixed bottom-6 right-6 z-[99] max-w-sm w-full bg-surface border border-border/80 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
              <Info size={16} />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-bold text-white uppercase tracking-wider">Actualizaciones</p>
              <p className="text-[11px] text-muted leading-normal">{manualCheckResult}</p>
            </div>
            <button onClick={closeManualResult} className="text-muted hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main PWA Update Banner */}
      {hasUpdate && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-md bg-black/90 backdrop-blur-md border border-accent/20 rounded-[2rem] p-6 shadow-2xl shadow-accent/5 animate-in slide-in-from-bottom-10 duration-300">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0 animate-pulse">
                <RefreshCw size={18} />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-black text-white uppercase tracking-wider italic">Nueva versión disponible</h4>
                <p className="text-[10px] text-muted font-medium leading-relaxed">
                  Actualiza para ver las últimas mejoras. El proceso es inmediato y mantendrá tus accesos seguros.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={triggerUpdate}
                className="flex-1 bg-accent hover:bg-accent/80 text-black text-[10px] font-black uppercase tracking-widest py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
                Actualizar ahora
              </button>
              <button
                onClick={() => setHasUpdate(false)}
                className="px-4 py-3 bg-surface hover:bg-muted/10 text-muted hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-border/50 transition-all duration-300"
              >
                Ignorar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Debug Dashboard Badge */}
      {isAdmin && (
        <div className="fixed bottom-4 left-4 z-[85] hidden md:block">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="flex items-center gap-2 bg-surface/80 hover:bg-surface border border-border/50 text-muted hover:text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg backdrop-blur-sm transition-all duration-300"
          >
            <Cpu size={10} className={checking ? 'animate-spin' : ''} />
            PWA: {localVersion}
          </button>

          {showDebug && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border/80 rounded-2xl p-4 shadow-2xl text-[10px] space-y-3 font-mono text-muted animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="font-bold text-white flex items-center gap-1 uppercase tracking-wider text-[9px]">
                  <Cpu size={10} className="text-accent" /> PWA Debug Panel
                </span>
                <button onClick={() => setShowDebug(false)} className="text-muted hover:text-white">
                  <X size={10} />
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Versión Local:</span>
                  <span className="text-white font-bold">{localVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span>Versión Servidor:</span>
                  <span className="text-white font-bold">{serverVersion?.version || 'checking...'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Build Time Local:</span>
                  <span className="text-white text-[8px] truncate max-w-[120px]">{localBuildTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Build Time Servidor:</span>
                  <span className="text-white text-[8px] truncate max-w-[120px]">{serverVersion?.buildTime || 'checking...'}</span>
                </div>
                <div className="flex justify-between">
                  <span>SW Status:</span>
                  <span className={`font-bold uppercase tracking-wider text-[8px] ${
                    swStatus === 'waiting' ? 'text-accent' : 
                    swStatus === 'active' ? 'text-green-500' : 'text-orange-500'
                  }`}>{swStatus}</span>
                </div>
              </div>
              <button
                onClick={() => checkVersion(true)}
                disabled={checking}
                className="w-full bg-accent/10 border border-accent/20 hover:bg-accent/20 text-accent text-[9px] font-black uppercase tracking-widest py-2 rounded-xl transition-all duration-300"
              >
                Forzar Verificación
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
