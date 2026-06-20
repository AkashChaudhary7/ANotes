import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import PDFExporter from './components/PDFExporter';
import MindMapRenderer from './components/MindMapRenderer';
import QuizWorkspace from './components/QuizWorkspace';
import DiagnosticPanel, { DiagnosticLog } from './components/DiagnosticPanel';
import { Folder, Note } from './types';
import { getFolders, getNotes, saveFolder, deleteFolder, saveNote, deleteNote, seedInitialDataIfNeeded } from './utils/db';
import { Sparkles, Info, Menu, Plus, HelpCircle } from 'lucide-react';
import {
  auth,
  loginAnonymously,
  logoutUser,
  getFoldersFromFirestore,
  getNotesFromFirestore,
  saveFolderToFirestore,
  saveNoteToFirestore,
  deleteFolderFromFirestore,
  deleteNoteFromFirestore,
  onAuthStateChanged
} from './utils/firebase';
import firebaseConfig from '../firebase-applet-config.json';

export default function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  // Authentication & cloud syncing states (Minimalist study desk)
  const [user, setUser] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLocalDbLoaded, setIsLocalDbLoaded] = useState(false);

  // Dark theme states (persists in localStorage, defaults to dark as requested!)
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme-dark') === 'true' || true;
  });

  // Modal selectors
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showMindModal, setShowMindModal] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  // Diagnostics logging panel states
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<DiagnosticLog[]>([]);

  const addDiagnosticLog = (type: 'info' | 'success' | 'warning' | 'error', message: string, code?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog: DiagnosticLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      type,
      message,
      code
    };
    setDiagnosticLogs(prev => {
      const logs = [...prev, newLog];
      if (logs.length > 100) {
        return logs.slice(logs.length - 100);
      }
      return logs;
    });
  };

  // PWA Install Prompt reference
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Dark theme side-effects
  useEffect(() => {
    localStorage.setItem('theme-dark', String(isDark));
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Responsive layout resizing effect
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bootstrap diagnostic environment checks
  useEffect(() => {
    addDiagnosticLog('info', 'Sandbox context starting up cleanly...');
    
    // Iframe detector
    if (window.self !== window.top) {
      addDiagnosticLog('warning', 'Modern security restriction: Application is loaded inside an iframe (sandbox). Third-party cookies and popup message headers might be blocked by browsers.');
    } else {
      addDiagnosticLog('success', 'Standalone execution: Application is running outside of local sandboxing. Auth handshakes should proceed smoothly.');
    }

    if (window.isSecureContext) {
      addDiagnosticLog('success', 'Platform environment context is secure (HTTPS or localhost).');
    } else {
      addDiagnosticLog('warning', 'Platform environment warning: Secure context check failed. Some browser auth parameters may deny authorization.');
    }

    if (typeof window.indexedDB !== 'undefined') {
      addDiagnosticLog('success', 'Persistent client layer is healthy and running: IndexedDB configured.');
    } else {
      addDiagnosticLog('error', 'Execution error: IndexedDB support is unavailable on this browser.');
    }

    // Verify Firebase credentials block
    try {
      addDiagnosticLog('info', `Firebase authentication system initialized with project ID: ${firebaseConfig.projectId || 'N/A'}`);
    } catch {
      addDiagnosticLog('error', 'Firebase load exception: Failed to read backend JSON properties configuration.');
    }
  }, []);

  // Initial load and seeding
  useEffect(() => {
    async function initDB() {
      const dbData = await seedInitialDataIfNeeded();
      setFolders(dbData.folders);
      setNotes(dbData.notes);

      if (dbData.notes.length > 0) {
        setActiveNoteId(dbData.notes[0].id);
      }
      setIsLocalDbLoaded(true);
    }
    initDB();

    // Register PWA beforeinstallprompt handler
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('beforeinstallprompt event triggered and captured!');
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  // Firebase auth sync states hook - only runs once local DB loads
  useEffect(() => {
    if (!isLocalDbLoaded) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        addDiagnosticLog('success', `Cloud Backup active. Session UID: ${firebaseUser.uid}`);
        setIsSyncing(true);
        try {
          // Fetch Cloud Firestore states
          const cloudFolders = await getFoldersFromFirestore(firebaseUser.uid);
          const cloudNotes = await getNotesFromFirestore(firebaseUser.uid);

          if (cloudFolders.length === 0 && cloudNotes.length === 0) {
            addDiagnosticLog('info', 'Cloud Sync: Connecting remote database to local client...');
            // First time pairing: sync current local items to Firestore
            const localFolders = await getFolders();
            const localNotes = await getNotes();
            for (const f of localFolders) {
              await saveFolderToFirestore(f, firebaseUser.uid);
            }
            for (const n of localNotes) {
              await saveNoteToFirestore(n, firebaseUser.uid);
            }
            addDiagnosticLog('success', 'Cloud Sync: Successfully backed up existing items in Cloud!');
          } else {
            addDiagnosticLog('info', `Cloud Sync: Downloading ${cloudFolders.length} folders and ${cloudNotes.length} notes...`);
            // Synchronize from Cloud Firestore down to IndexedDB cache
            for (const f of cloudFolders) {
              await saveFolder(f);
            }
            for (const n of cloudNotes) {
              await saveNote(n);
            }

            // Remove items locally that were deleted globally
            const localFolders = await getFolders();
            for (const lf of localFolders) {
              if (!cloudFolders.some(cf => cf.id === lf.id)) {
                await deleteFolder(lf.id);
              }
            }
            const localNotes = await getNotes();
            for (const ln of localNotes) {
              if (!cloudNotes.some(cn => cn.id === ln.id)) {
                await deleteNote(ln.id);
              }
            }

            // Update primary state tree
            setFolders(cloudFolders);
            setNotes(cloudNotes);
            if (cloudNotes.length > 0) {
              const activeExists = cloudNotes.some(n => n.id === activeNoteId);
              if (!activeExists) {
                const activeOnes = cloudNotes.filter(n => !n.isDeleted);
                setActiveNoteId(activeOnes.length > 0 ? activeOnes[0].id : cloudNotes[0].id);
              }
            }
            addDiagnosticLog('success', 'Cloud Sync: Synchronized!');
          }
        } catch (err: any) {
          console.error('Error synchronizing with Firestore database:', err);
          addDiagnosticLog('error', `Cloud Sync Exception: ${err?.message || String(err)}`);
        } finally {
          setIsSyncing(false);
        }
      } else {
        addDiagnosticLog('info', 'Firestore Backup: Operating in localized cache fallback mode.');
        // Logged-out state: fallback down to IndexedDB
        const localFolders = await getFolders();
        const localNotes = await getNotes();
        setFolders(localFolders);
        setNotes(localNotes);
      }
    });

    return () => unsubscribe();
  }, [isLocalDbLoaded]);

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  // Folder actions
  const handleCreateFolder = async (name: string, color?: string) => {
    const newFolder: Folder = {
      id: 'f-' + Math.random().toString(36).substr(2, 9),
      name,
      color: color || 'bg-zinc-100 text-zinc-805 border-zinc-200',
      createdAt: Date.now()
    };
    await saveFolder(newFolder);
    if (user) {
      await saveFolderToFirestore(newFolder, user.uid);
    }
    setFolders(prev => [newFolder, ...prev]);
  };

  const handleDeleteFolderAction = async (folderId: string) => {
    await deleteFolder(folderId);
    if (user) {
      await deleteFolderFromFirestore(folderId, user.uid);
    }
    setFolders(prev => prev.filter(f => f.id !== folderId));
    // Update local state notes too, as their folderId is now null in IndexedDB
    setNotes(prev => prev.map(note => {
      if (note.folderId === folderId) {
        const updated = { ...note, folderId: null, updatedAt: Date.now() };
        if (user) {
          saveNoteToFirestore(updated, user.uid);
        }
        return updated;
      }
      return note;
    }));
  };

  // Note actions
  const handleSelectNote = (noteId: string) => {
    setActiveNoteId(noteId);
    setShowQuiz(false);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleCreateNote = async (folderId: string | null) => {
    const newNote: Note = {
      id: 'n-' + Math.random().toString(36).substr(2, 9),
      folderId,
      title: '',
      coverEmoji: '📝',
      coverImage: 'linear-gradient(135deg, #27272a 0%, #09090b 100%)',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      blocks: [
        { id: 'b-start-h', type: 'heading-1', content: 'New Note' },
        { id: 'b-start-p', type: 'paragraph', content: 'Type your thoughts here, click empty space, or press Enter for new blocks.' }
      ],
      tags: [],
      pinned: false,
      isDeleted: false
    };

    await saveNote(newNote);
    if (user) {
      await saveNoteToFirestore(newNote, user.uid);
    }
    setShowQuiz(false);
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
  };

  const handleDeleteNoteAction = async (noteId: string) => {
    const targetNote = notes.find(n => n.id === noteId);
    if (!targetNote) return;
    const updated: Note = {
      ...targetNote,
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now()
    };
    await saveNote(updated);
    if (user) {
      await saveNoteToFirestore(updated, user.uid);
    }
    setNotes(prev => prev.map(n => n.id === noteId ? updated : n));

    // Choose another active note if the deleted one was selected
    if (activeNoteId === noteId) {
      const remainingActive = notes.filter(n => n.id !== noteId && !n.isDeleted);
      setActiveNoteId(remainingActive.length > 0 ? remainingActive[0].id : null);
    }
  };

  const handleRestoreNoteAction = async (noteId: string) => {
    const targetNote = notes.find(n => n.id === noteId);
    if (!targetNote) return;
    const updated: Note = {
      ...targetNote,
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: Date.now()
    };
    await saveNote(updated);
    if (user) {
      await saveNoteToFirestore(updated, user.uid);
    }
    setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
    setActiveNoteId(noteId);
  };

  const handleDeleteNotePermanentlyAction = async (noteId: string) => {
    await deleteNote(noteId);
    if (user) {
      await deleteNoteFromFirestore(noteId, user.uid);
    }
    setNotes(prev => {
      const nextNotes = prev.filter(n => n.id !== noteId);
      if (activeNoteId === noteId) {
        const remainingActive = nextNotes.filter(n => !n.isDeleted);
        setActiveNoteId(remainingActive.length > 0 ? remainingActive[0].id : null);
      }
      return nextNotes;
    });
  };

  const handleEmptyTrashAction = async () => {
    const trashedNotes = notes.filter(n => !!n.isDeleted);
    if (trashedNotes.length === 0) return;
    for (const tn of trashedNotes) {
      await deleteNote(tn.id);
      if (user) {
        await deleteNoteFromFirestore(tn.id, user.uid);
      }
    }
    setNotes(prev => {
      const remainingNotes = prev.filter(n => !n.isDeleted);
      if (activeNoteId && trashedNotes.some(tn => tn.id === activeNoteId)) {
        setActiveNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
      }
      return remainingNotes;
    });
  };

  const handleUpdateNoteAction = async (updatedNote: Note) => {
    await saveNote(updatedNote);
    if (user) {
      await saveNoteToFirestore(updatedNote, user.uid);
    }
    setNotes(prev => {
      if (prev.some(n => n.id === updatedNote.id)) {
        return prev.map(n => n.id === updatedNote.id ? updatedNote : n);
      }
      return [updatedNote, ...prev];
    });
  };

  const handleMoveNoteAction = async (noteId: string, folderId: string | null) => {
    const targetNote = notes.find(n => n.id === noteId);
    if (targetNote) {
      const updated = { ...targetNote, folderId, updatedAt: Date.now() };
      await handleUpdateNoteAction(updated);
    }
  };

  const handleTogglePinAction = async (noteId: string) => {
    const targetNote = notes.find(n => n.id === noteId);
    if (!targetNote) return;
    const updated: Note = {
      ...targetNote,
      pinned: !targetNote.pinned,
      updatedAt: Date.now()
    };
    await saveNote(updated);
    if (user) {
      await saveNoteToFirestore(updated, user.uid);
    }
    setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
  };

  // PWA Prompt Installation trigger button actions
  const handleTriggerPWAInstall = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      } else {
        console.log('User dismissed the PWA install prompt');
      }
      setDeferredPrompt(null);
    });
  };

  const themeLayoutBg = isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-850';

  return (
    <div id="anotes-app-root" className={`flex h-screen w-screen overflow-hidden select-text font-sans relative transition-colors duration-200 ${themeLayoutBg}`}>
      {/* Visual backdrop overlay for mobile view when sidebar is active */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 pointer-events-auto"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Visual Workspace Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onTogglePin={handleTogglePinAction}
        folders={folders}
        notes={notes}
        activeNoteId={activeNoteId}
        onSelectNote={handleSelectNote}
        onCreateFolder={handleCreateFolder}
        onCreateNote={handleCreateNote}
        onDeleteFolder={handleDeleteFolderAction}
        onDeleteNote={handleDeleteNoteAction}
        onRestoreNote={handleRestoreNoteAction}
        onDeleteNotePermanently={handleDeleteNotePermanentlyAction}
        onEmptyTrash={handleEmptyTrashAction}
        onMoveNote={handleMoveNoteAction}
        pwaInstallEvent={deferredPrompt}
        onTriggerInstall={handleTriggerPWAInstall}
        
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        user={user}
        isSyncing={isSyncing}
        isQuizActive={showQuiz}
        onOpenQuizZone={() => {
          setShowQuiz(true);
          setActiveNoteId(null);
          if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
          }
        }}
        onOpenDiagnostics={() => setShowDiagnosticPanel(true)}
      />

      {/* Primary Workspace container */}
      <div className="flex-1 h-full overflow-hidden flex flex-col z-10 select-text relative">
        {/* Mobile Header Toolbar */}
        <div className={`md:hidden flex items-center justify-between px-4 py-3 shrink-0 border-b select-none transition ${
          isDark ? 'bg-zinc-900/60 border-zinc-850 text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
        }`}>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`p-1 rounded-lg transition active:scale-95 cursor-pointer border ${
              isDark ? 'bg-zinc-950 hover:bg-zinc-805 border-zinc-805 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 hover:bg-zinc-100 text-zinc-500'
            }`}
            title="Open Sidebar Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5 font-sans font-bold text-xs tracking-tight uppercase opacity-80">
            <span>ANotes Desk</span>
          </div>
          <button
            onClick={() => handleCreateNote(null)}
            className={`p-1.5 rounded-lg transition active:scale-95 cursor-pointer border ${
              isDark ? 'bg-zinc-950 hover:bg-zinc-850 border-zinc-805 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 hover:bg-zinc-100 text-zinc-500'
            }`}
            title="Create New Quick Note"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>

        {showQuiz ? (
          <QuizWorkspace
            notes={notes}
            onUpdateNote={handleUpdateNoteAction}
            onClose={() => setShowQuiz(false)}
            isDark={isDark}
          />
        ) : activeNote ? (
          <Editor
            note={activeNote}
            onUpdateNote={handleUpdateNoteAction}
            onRestoreNote={handleRestoreNoteAction}
            onDeletePermanently={handleDeleteNotePermanentlyAction}
            onOpenPdfExporter={() => setShowPdfModal(true)}
            onOpenMindMap={() => setShowMindModal(true)}
          />
        ) : (
          <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center select-none ${
            isDark ? 'bg-zinc-950 text-zinc-300' : 'bg-zinc-50/50 text-zinc-888'
          }`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border transition ${
              isDark ? 'bg-zinc-900 border-zinc-850 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
            }`}>
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className={`text-lg font-bold font-sans ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>Study desk is quiet</h2>
            <p className="text-xs text-zinc-500 max-w-sm mt-1.5 select-none leading-relaxed">
              Select an note page from the folders to start writing, or create a brand new note assignment.
            </p>
            <button
              onClick={() => handleCreateNote(null)}
              className={`mt-4 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer border ${
                isDark ? 'bg-zinc-900 border-zinc-850 text-zinc-200 hover:bg-zinc-805' : 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800'
              }`}
            >
              + Create Note
            </button>
          </div>
        )}
      </div>

      {/* PDF PREMIUM EXPORT CONTROLS */}
      {showPdfModal && activeNote && (
        <PDFExporter
          note={activeNote}
          onClose={() => setShowPdfModal(false)}
        />
      )}

      {/* STUDY MIND MAP VISUAL PREVIEW */}
      {showMindModal && activeNote && (
        <MindMapRenderer
          note={activeNote}
          onClose={() => setShowMindModal(false)}
        />
      )}

      {/* DETAILED DIAGNOSTICS & SYSTEM EVENT CHRONOLOGY PANEL */}
      <DiagnosticPanel
        isOpen={showDiagnosticPanel}
        onClose={() => setShowDiagnosticPanel(false)}
        logs={diagnosticLogs}
        onClearLogs={() => setDiagnosticLogs([])}
        isDark={isDark}
      />
    </div>
  );
}
