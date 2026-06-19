import React from 'react';
import {
  X,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Shield,
  Database,
  Cookie,
  Globe,
  Lock,
  ChevronRight
} from 'lucide-react';

export interface DiagnosticLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  code?: string;
}

interface DiagnosticPanelProps {
  isOpen: boolean;
  onClose: () => void;
  logs: DiagnosticLog[];
  onClearLogs: () => void;
  isDark: boolean;
}

export default function DiagnosticPanel({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  isDark
}: DiagnosticPanelProps) {
  if (!isOpen) return null;

  // Perform environment diagnostics
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;
  const cookiesEnabled = typeof navigator !== 'undefined' && navigator.cookieEnabled;
  const indexedDbSupported = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'unknown';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 select-text animate-fade-in">
      <div className={`w-full max-w-2xl h-[90vh] md:h-[80vh] border rounded-2xl flex flex-col shadow-2xl overflow-hidden ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-slate-800'
      }`}>
        {/* Panel Header */}
        <div className={`p-4 border-b flex items-center justify-between select-none ${isDark ? 'border-zinc-800 bg-zinc-950/40' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Applet Security & Auth Diagnostics</h3>
              <p className="text-[10px] text-zinc-400">Environment validation and live Firebase log records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Diagnostic Checks & Live Log Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          {/* Quick Checker Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Sandbox Card */}
            <div className={`p-3.5 border rounded-xl flex items-start gap-3 ${
              isIframe 
                ? (isDark ? 'bg-rose-950/10 border-rose-900/30' : 'bg-rose-50/50 border-rose-100')
                : (isDark ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-emerald-50/50 border-emerald-100')
            }`}>
              <div className="mt-0.5">
                {isIframe ? (
                  <AlertTriangle className={`h-4.5 w-4.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                ) : (
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                )}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-xs leading-none">Iframe Sandbox Check</p>
                <p className={`text-[10px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  {isIframe 
                    ? 'In-Iframe: Sign-in popups are heavily blocked on browsers due to third-party isolation policies.'
                    : 'Isolated Main Window: Secure popups can freely process handshake communication.'}
                </p>
                {isIframe && (
                  <div className="pt-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                      isDark ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-100 text-rose-700'
                    }`}>
                      Requires Launching in New Tab
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Secure context check */}
            <div className={`p-3.5 border rounded-xl flex items-start gap-3 ${
              isSecure 
                ? (isDark ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-emerald-50/50 border-emerald-100')
                : (isDark ? 'bg-rose-950/10 border-rose-900/30' : 'bg-rose-50/50 border-rose-100')
            }`}>
              <div className="mt-0.5">
                {isSecure ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                ) : (
                  <AlertTriangle className={`h-4.5 w-4.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                )}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-xs leading-none">Secure Context (HTTPS)</p>
                <p className={`text-[10px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  {isSecure 
                    ? `Running in secure content environment (${protocol}://). SSL is verified.`
                    : 'Running in non-secure context. Some identity features might fail.'}
                </p>
              </div>
            </div>

            {/* Client Cache Storage Check */}
            <div className={`p-3.5 border rounded-xl flex items-start gap-3 ${
              indexedDbSupported 
                ? (isDark ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-emerald-50/50 border-emerald-100')
                : (isDark ? 'bg-amber-950/10 border-amber-900/30' : 'bg-amber-50/50 border-amber-100')
            }`}>
              <div className="mt-0.5">
                <Database className={`h-4.5 w-4.5 ${indexedDbSupported ? 'text-emerald-500' : 'text-amber-500'}`} />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-xs leading-none">IndexedDB offline Cache</p>
                <p className={`text-[10px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  {indexedDbSupported 
                    ? 'Storage is healthy. Your study notes persist locally when network sinks are absent.'
                    : 'No IndexedDB. Notes will only save in temporary volatile heap.'}
                </p>
              </div>
            </div>

            {/* Cookies isolation context check */}
            <div className={`p-3.5 border rounded-xl flex items-start gap-3 ${
              cookiesEnabled 
                ? (isDark ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-emerald-50/50 border-emerald-100')
                : (isDark ? 'bg-rose-950/10 border-rose-900/30' : 'bg-rose-50/50 border-rose-100')
            }`}>
              <div className="mt-0.5">
                <Cookie className={`h-4.5 w-4.5 ${cookiesEnabled ? 'text-emerald-500' : 'text-rose-500'}`} />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-xs leading-none">Browser Cookies Permission</p>
                <p className={`text-[10px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  {cookiesEnabled 
                    ? 'Cookies of client browser are allowed. Necessary for Google Auth state token persistence.'
                    : 'Google Sign-In will immediately throw on state serialization because cookies are rejected.'}
                </p>
              </div>
            </div>
          </div>

          {/* Technical metadata list */}
          <div className={`p-4 rounded-xl border text-[11px] font-mono space-y-2 ${
            isDark ? 'bg-zinc-950/50 border-zinc-850 text-zinc-400' : 'bg-slate-50/50 border-slate-100 text-slate-600'
          }`}>
            <p className="font-sans font-bold text-xs uppercase tracking-wider mb-2 select-none" style={{ color: isDark ? '#a5b4fc' : '#4f46e5' }}>Active Host & UA Metadata</p>
            <div className="flex justify-between border-b pb-1 dark:border-zinc-900/50 border-slate-100">
              <span className="font-sans text-slate-400 dark:text-zinc-500 select-none">Web HOST Platform:</span>
              <span className="font-semibold truncate max-w-[70%]">{hostname}</span>
            </div>
            <div className="flex justify-between border-b pb-1 dark:border-zinc-900/50 border-slate-100">
              <span className="font-sans text-slate-400 dark:text-zinc-500 select-none">HTTPS Protocol:</span>
              <span className="font-semibold">{protocol}</span>
            </div>
            <div className="flex justify-between border-b pb-1 dark:border-zinc-900/50 border-slate-100">
              <span className="font-sans text-slate-400 dark:text-zinc-500 select-none font-medium">Browser Client Spec:</span>
              <span className="font-semibold truncate max-w-[65%]" title={userAgent}>{userAgent}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-slate-400 dark:text-zinc-500 select-none">Auth Method:</span>
              <span className="font-semibold">Firebase Google Auth Popups</span>
            </div>
          </div>

          {/* Chronicle Logs Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between select-none">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-550 dark:text-zinc-400">Events Diagnostics Log</h4>
              <button
                onClick={onClearLogs}
                disabled={logs.length === 0}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition ${
                  logs.length === 0 
                  ? 'opacity-40 cursor-not-allowed text-zinc-500' 
                  : (isDark ? 'hover:bg-zinc-800 text-rose-400' : 'hover:bg-rose-50 text-rose-600')
                }`}
              >
                <Trash2 className="h-3 w-3" />
                <span>Flush Logs</span>
              </button>
            </div>

            {/* List */}
            <div className={`rounded-xl border divide-y overflow-hidden max-h-60 overflow-y-auto font-mono text-[11px] ${
              isDark ? 'bg-zinc-950 border-zinc-850 divide-zinc-900' : 'bg-slate-50 border-slate-200 divide-slate-150'
            }`}>
              {logs.length === 0 ? (
                <div className="p-6 text-center text-zinc-400 dark:text-zinc-500 font-sans italic text-xs">
                  No chronological logs recorded in memory yet. Perform actions to start capturing logs.
                </div>
              ) : (
                [...logs].reverse().map(log => {
                  let alertBg = '';
                  let badgeColor = '';
                  let typeText = 'INFO';

                  if (log.type === 'success') {
                    alertBg = isDark ? 'bg-emerald-950/10' : 'bg-emerald-50/20';
                    badgeColor = 'text-emerald-500 font-bold';
                    typeText = 'SUCCESS';
                  } else if (log.type === 'warning') {
                    alertBg = isDark ? 'bg-amber-950/10' : 'bg-amber-50/20';
                    badgeColor = 'text-amber-500 font-bold';
                    typeText = 'WARNING';
                  } else if (log.type === 'error') {
                    alertBg = isDark ? 'bg-rose-950/10' : 'bg-rose-50/20';
                    badgeColor = 'text-rose-500 font-bold';
                    typeText = 'CRITICAL';
                  } else {
                    alertBg = '';
                    badgeColor = 'text-indigo-400 font-bold dark:text-indigo-300';
                  }

                  return (
                    <div key={log.id} className={`p-3 space-y-1.5 transition leading-normal ${alertBg}`}>
                      <div className="flex items-center justify-between select-none">
                        <span className={`text-[9px] uppercase tracking-wider ${badgeColor}`}>{typeText}</span>
                        <span className="text-[9px] text-slate-400 dark:text-zinc-630">{log.timestamp}</span>
                      </div>
                      <p className={isDark ? 'text-zinc-200' : 'text-slate-800'}>{log.message}</p>
                      {log.code && (
                        <div className="pt-1 select-all">
                          <code className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isDark ? 'bg-zinc-900 border border-zinc-800 text-rose-300' : 'bg-rose-100 text-rose-700'
                          }`}>
                            CODE: {log.code}
                          </code>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Diagnostic Panel Footer (Help and Actionable guide) */}
        <div className={`p-4 border-t flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] select-none ${
          isDark ? 'border-zinc-800 bg-zinc-950/30' : 'border-slate-100 bg-slate-50/30'
        }`}>
          <div className="flex items-start gap-2 max-w-md">
            <Info className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
            <p className="text-zinc-450 leading-relaxed">
              If popups fail, click the <strong className="text-zinc-300 dark:text-white">Open in New Tab URL Anchor icon</strong> in the topmost preview bar. This bypasses the iframe sandboxing that causes modern secure browser restrictions.
            </p>
          </div>
          <button
            onClick={() => {
              window.open(window.location.href, '_blank');
            }}
            className={`w-full md:w-auto px-4 py-2 font-bold uppercase tracking-wider rounded-xl transition inline-flex items-center justify-center gap-1.5 cursor-pointer text-[10px] select-none shadow-sm pb-1.5 pt-1.5 ${
              isDark 
              ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700' 
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <span>Bypass Sandbox (Open New Tab)</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
