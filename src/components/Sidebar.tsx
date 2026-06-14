import React, { useState } from 'react';
import { Folder as FolderType, Note } from '../types';
import {
  Folder as FolderIcon,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  FileText,
  Search,
  Settings,
  Download,
  Info,
  Calendar,
  Layers,
  ArrowRightLeft,
  X,
  RotateCcw,
  Pin,
  Tag,
  Sun,
  Moon,
  Cloud,
  CloudOff,
  Brain
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  onTogglePin: (noteId: string) => void;
  folders: FolderType[];
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateFolder: (name: string, color?: string) => void;
  onCreateNote: (folderId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRestoreNote: (noteId: string) => void;
  onDeleteNotePermanently: (noteId: string) => void;
  onEmptyTrash: () => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  pwaInstallEvent: any;
  onTriggerInstall: () => void;
  
  // Custom Sync & Minimalism Dark Theme additions
  isDark: boolean;
  onToggleDark: () => void;
  user: any; // Firebase user authentication
  isSyncing: boolean;
  onLogin: () => void;
  onLogout: () => void;
  isQuizActive: boolean;
  onOpenQuizZone: () => void;
}

export default function Sidebar({
  isOpen,
  onCloseMobile,
  onTogglePin,
  folders,
  notes,
  activeNoteId,
  onSelectNote,
  onCreateFolder,
  onCreateNote,
  onDeleteFolder,
  onDeleteNote,
  onRestoreNote,
  onDeleteNotePermanently,
  onEmptyTrash,
  onMoveNote,
  pwaInstallEvent,
  onTriggerInstall,
  
  isDark,
  onToggleDark,
  user,
  isSyncing,
  onLogin,
  onLogout,
  isQuizActive,
  onOpenQuizZone
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [isTrashExpanded, setIsTrashExpanded] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'f-sociology': true,
    'f-ssc': true,
    'f-personal': true
  });
  const [selectedFolderColor, setSelectedFolderColor] = useState('bg-zinc-100 text-zinc-800 border-zinc-200');
  const [noteToMove, setNoteToMove] = useState<Note | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const folderColors = [
    { class: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700', name: 'Minimal Charcoal' },
    { class: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900', name: 'Academic Blue' },
    { class: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900', name: 'Amber Gold' },
    { class: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900', name: 'Royal Purple' },
    { class: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-900', name: 'Forest Teal' },
    { class: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900', name: 'Rose Red' },
  ];

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), selectedFolderColor);
    setNewFolderName('');
    setShowAddFolder(false);
  };

  // Filter notes based on search query, splitting active vs deleted notes
  const activeNotes = notes.filter(n => !n.isDeleted);
  const trashNotes = notes.filter(n => !!n.isDeleted);

  // Compute all unique tags from active notes
  const allTags = Array.from(
    new Set(activeNotes.flatMap(n => n.tags || []))
  ).sort();

  const filteredNotes = activeNotes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.blocks.some(b => b.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = selectedTag ? (n.tags || []).includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  const filteredTrashNotes = trashNotes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.blocks.some(b => b.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const unassignedNotes = filteredNotes.filter(n => n.folderId === null);

  const getDaysLeft = (deletedAt?: number) => {
    if (!deletedAt) return '30d';
    const msDiff = Date.now() - deletedAt;
    const daysDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    const remains = 30 - daysDiff;
    return `${Math.max(0, remains)}d`;
  };

  const themeTextMuted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const themeBorder = isDark ? 'border-zinc-900' : 'border-zinc-200/60';

  return (
    <div className={`fixed inset-y-0 left-0 z-50 md:relative md:flex w-80 flex flex-col h-full select-none transform transition-all duration-300 ease-in-out ${
      isDark 
        ? 'bg-zinc-950 border-r border-zinc-900 text-zinc-200' 
        : 'bg-zinc-50 border-r border-zinc-200 text-zinc-800'
    } ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      
      {/* App Header branding / Theme Switcher */}
      <div className={`p-5 border-b flex flex-col gap-4 ${themeBorder}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm tracking-tight border shadow-xs transition ${
              isDark 
                ? 'bg-zinc-900 text-zinc-100 border-zinc-850' 
                : 'bg-white text-zinc-800 border-zinc-200'
            }`}>
              AN
            </div>
            <div>
              <h1 className={`font-sans font-bold text-sm tracking-tight leading-none ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>ANotes</h1>
              <span className="text-[9px] font-mono opacity-60 tracking-wider uppercase font-semibold">Minimal study desk</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* Minimalist Theme switch button */}
            <button
              onClick={onToggleDark}
              className={`p-1.5 rounded-lg transition active:scale-95 cursor-pointer border ${
                isDark 
                  ? 'bg-zinc-900 hover:bg-zinc-850 text-amber-400 border-zinc-850' 
                  : 'bg-white hover:bg-zinc-100 text-zinc-500 border-zinc-200/80'
              }`}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className={`md:hidden p-1.5 rounded-lg border transition cursor-pointer ${
                  isDark ? 'bg-zinc-900 border-zinc-850 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500'
                }`}
                title="Close sidebar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Minimal Cloud Sync Dashboard Card */}
        <div className={`p-3 rounded-xl border text-xs transition ${
          isDark 
            ? 'bg-zinc-900/40 border-zinc-900 text-zinc-200' 
            : 'bg-white border-zinc-200/50 text-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.01)]'
        }`}>
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-6 h-6 rounded-md pointer-events-none" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-200 font-bold text-[10px] font-mono text-center">
                    {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold truncate text-[10px] leading-tight ${isDark ? 'text-zinc-250' : 'text-zinc-900'}`}>
                    {user.displayName || 'Authorized User'}
                  </h4>
                  <p className="text-[9px] text-zinc-400 truncate leading-none">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-zinc-100 dark:border-zinc-850">
                <span className="flex items-center gap-1 text-emerald-500 font-semibold uppercase tracking-wider text-[8px]">
                  <Cloud className="h-3 w-3" />
                  <span>Cloud Synced</span>
                </span>
                <button 
                  onClick={onLogout}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition text-[9px] select-none cursor-pointer underline"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-0.5">
              <div className="flex items-center gap-1 text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">
                <CloudOff className="h-3 w-3 text-zinc-400" />
                <span>Cloud Sync Offline</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-normal">
                Sign in to automatically sync and backup your assignments securely on Firestore database.
              </p>
              <button
                onClick={onLogin}
                className={`w-full py-1.5 px-3 rounded-lg font-semibold text-[10px] flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer border ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-850 hover:bg-zinc-800 text-zinc-100'
                    : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-800'
                }`}
              >
                <span>Google Account</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search notes, outline points..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full border rounded-lg pl-9 pr-4 py-1.5 text-xs transition ${
              isDark 
                ? 'bg-zinc-900/60 border-zinc-900 text-zinc-200 placeholder-zinc-500 focus:border-zinc-805 focus:outline-none' 
                : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-300 focus:outline-none'
            }`}
          />
        </div>
      </div>

      {/* Tags Filter Section */}
      {allTags.length > 0 && (
        <div className={`px-3 pb-3 border-b ${themeBorder}`}>
          <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 px-1">
            <span className="flex items-center gap-1 text-zinc-500">
              <Tag className="h-2.5 w-2.5" />
              <span>Filter Tags</span>
            </span>
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="text-[9px] text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-250 font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-none">
            {allTags.map(tag => {
              const isSelected = selectedTag === tag;
              const count = activeNotes.filter(n => (n.tags || []).includes(tag)).length;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer border ${
                    isSelected
                      ? (isDark ? 'bg-zinc-100 border-zinc-100 text-zinc-950 font-bold' : 'bg-zinc-900 border-zinc-900 text-zinc-50 font-bold')
                      : (isDark ? 'bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:text-zinc-200' : 'bg-white border-zinc-200/50 text-zinc-500 hover:bg-zinc-100')
                  }`}
                >
                  <span>#{tag}</span>
                  <span className="text-[8px] opacity-70">
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Primary Navigation & Folders */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2 scrollbar-none">
        
        {/* AI Quiz Zone Option */}
        <button
          onClick={onOpenQuizZone}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition duration-200 select-none border mb-2 cursor-pointer ${
            isQuizActive
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
              : isDark
                ? 'bg-zinc-900/40 border-zinc-900 text-zinc-350 hover:text-white hover:bg-zinc-800/40'
                : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/50'
          }`}
        >
          <div className={`p-1 rounded-md ${isQuizActive ? 'bg-indigo-500 text-white' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'}`}>
            <Brain className="h-4 w-4" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center justify-between">
              <span>AI Study Quiz</span>
              <span className={`text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded-md font-extrabold ${isQuizActive ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-500'}`}>
                NEW
              </span>
            </div>
            <p className={`text-[9px] font-normal leading-none mt-0.5 ${isQuizActive ? 'text-indigo-200' : 'opacity-60 text-zinc-500'}`}>
              Generate dynamic practice assessments
            </p>
          </div>
        </button>

        {/* Pinned Documents Section */}
        {activeNotes.filter(n => n.pinned).length > 0 && (
          <div className={`border-b ${themeBorder} pb-3`}>
            <div className="flex items-center justify-between px-3 py-1 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
              <span className="flex items-center gap-1">
                <Pin className="h-3 w-3 fill-current text-zinc-500" />
                <span>Pinned notes</span>
              </span>
            </div>
            <div className="mt-1 space-y-0.5">
              {activeNotes.filter(n => n.pinned).map(note => {
                const folder = folders.find(f => f.id === note.folderId);
                const isActive = activeNoteId === note.id;
                return (
                  <div
                    key={`pinned-${note.id}`}
                    className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                      isActive
                        ? (isDark ? 'bg-zinc-900 text-white font-semibold' : 'bg-zinc-200/60 text-zinc-950 font-semibold')
                        : (isDark ? 'hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200' : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900')
                    }`}
                    onClick={() => onSelectNote(note.id)}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <span className="text-sm flex-shrink-0">{note.coverEmoji || '📄'}</span>
                      <span className="truncate">{note.title || 'Untitled Note'}</span>
                      {folder && (
                        <span className={`text-[8px] truncate flex-shrink-0 px-1 py-0.5 rounded border ${
                          isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                        }`}>
                          {folder.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-150 transition ml-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(note.id);
                        }}
                        className="p-1 rounded hover:opacity-100 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200"
                        title="Unpin"
                      >
                        <Pin className="h-2.5 w-2.5 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Folders and Books Accordion */}
        <div>
          <div className="flex items-center justify-between px-3 py-1 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 id-folder-header-title uppercase tracking-widest">
            <span>Folders</span>
            <button
              onClick={() => setShowAddFolder(!showAddFolder)}
              className="p-1 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
              title="New folder"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* New folder creation menu block */}
          {showAddFolder && (
            <form onSubmit={handleCreateFolderSubmit} className={`m-2 p-2.5 rounded-xl border space-y-2.5 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'
            }`}>
              <input
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className={`w-full px-2.5 py-1 text-xs border rounded-md focus:outline-none focus:ring-1 ${
                  isDark 
                    ? 'bg-zinc-950 border-zinc-805 text-zinc-200 focus:ring-zinc-700 focus:border-zinc-700' 
                    : 'bg-white border-zinc-200 text-zinc-900 focus:ring-zinc-400 focus:border-zinc-400'
                }`}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {folderColors.slice(0, 4).map(fc => (
                    <button
                      key={fc.name}
                      type="button"
                      onClick={() => setSelectedFolderColor(fc.class)}
                      className={`w-4.5 h-4.5 rounded-full border transition active:scale-90 ${fc.class} ${
                        selectedFolderColor === fc.class ? 'ring-2 ring-zinc-500/50 scale-110' : 'opacity-80'
                      }`}
                      title={fc.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddFolder(false)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition ${
                      isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200' : 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800'
                    }`}
                  >
                    Create
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="mt-1.5 space-y-1">
            {folders.length === 0 ? (
              <p className="px-3 py-1 text-[10px] text-zinc-500 italic">No folders created</p>
            ) : (
              folders.map(folder => {
                const isExpanded = !!expandedFolders[folder.id];
                const folderNotes = filteredNotes.filter(n => n.folderId === folder.id);
                return (
                  <div key={folder.id} className="space-y-0.5">
                    <div className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                      isDark ? 'hover:bg-zinc-900/30' : 'hover:bg-zinc-100/50'
                    }`}>
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="flex items-center gap-2 truncate text-left flex-1 font-semibold text-zinc-750 dark:text-zinc-300 cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                        <FolderIcon className={`h-3.5 w-3.5 rounded px-0.5 text-zinc-500`} />
                        <span className="truncate">{folder.name}</span>
                        <span className="text-[9px] text-zinc-400 font-normal">({folderNotes.length})</span>
                      </button>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => onCreateNote(folder.id)}
                          className="p-0.5 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                          title="Create note in folder"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete the folder "${folder.name}"? Included notes will remain as Quick Notes.`)) {
                              onDeleteFolder(folder.id);
                            }
                          }}
                          className="p-0.5 rounded text-zinc-400 hover:text-rose-500"
                          title="Delete folder"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pl-5 border-l border-zinc-200 dark:border-zinc-900 ml-4 space-y-0.5 mt-0.5">
                        {folderNotes.length === 0 ? (
                          <p className="px-3.5 py-1 text-[10px] text-zinc-500 italic">Empty Folder</p>
                        ) : (
                          folderNotes.map(note => {
                            const isActive = activeNoteId === note.id;
                            return (
                              <div
                                key={note.id}
                                className={`group/note flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                                  isActive
                                    ? (isDark ? 'bg-zinc-900 text-white font-semibold shadow-xs' : 'bg-zinc-200/50 text-zinc-950 font-semibold shadow-xs')
                                    : (isDark ? 'hover:bg-zinc-900/40 text-zinc-450 hover:text-zinc-200' : 'hover:bg-zinc-100 text-zinc-650 hover:text-zinc-900')
                                }`}
                                onClick={() => onSelectNote(note.id)}
                              >
                                <span className="truncate flex-1 min-w-0 pr-1 flex items-center gap-1.5">
                                  <span className="text-sm flex-shrink-0">{note.coverEmoji || '📄'}</span>
                                  <span className="truncate">{note.title || 'Untitled'}</span>
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-note-hover:opacity-100 transition flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onTogglePin(note.id);
                                    }}
                                    className="p-0.5 rounded text-zinc-400 hover:text-zinc-200"
                                    title="Pin"
                                  >
                                    <Pin className={`h-2.5 w-2.5 ${note.pinned ? 'fill-current text-amber-500' : ''}`} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNoteToMove(note);
                                    }}
                                    className="p-0.5 rounded text-zinc-400 hover:text-zinc-200"
                                    title="Move"
                                  >
                                    <ArrowRightLeft className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteNote(note.id);
                                    }}
                                    className="p-0.5 rounded text-zinc-400 hover:text-rose-500"
                                    title="Trash"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Unassigned notes / Quick Notes heading */}
        <div>
          <div className="flex items-center justify-between px-3 py-1 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            <span>Quick Notes</span>
            <button
              onClick={() => onCreateNote(null)}
              className="p-1 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
              title="New floating note"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1 space-y-0.5">
            {unassignedNotes.length === 0 ? (
              <p className="px-3 py-1.5 text-[10px] text-zinc-500 italic">No floating notes</p>
            ) : (
              unassignedNotes.map(note => {
                const isActive = activeNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    className={`group/note flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                      isActive
                        ? (isDark ? 'bg-zinc-900 text-white font-semibold' : 'bg-zinc-200/50 text-zinc-950 font-semibold')
                        : (isDark ? 'hover:bg-zinc-900/40 text-zinc-450 hover:text-zinc-200' : 'hover:bg-zinc-100 text-zinc-650 hover:text-zinc-900')
                    }`}
                    onClick={() => onSelectNote(note.id)}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-1">
                      <span className="text-sm flex-shrink-0">{note.coverEmoji || '📄'}</span>
                      <span className="truncate">{note.title || 'Untitled Note'}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-note-hover:opacity-100 transition flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(note.id);
                        }}
                        className="p-0.5 rounded text-zinc-400 hover:text-zinc-200"
                        title="Pin"
                      >
                        <Pin className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteToMove(note);
                        }}
                        className="p-0.5 rounded text-zinc-400 hover:text-zinc-200"
                        title="Move to Folder"
                      >
                        <ArrowRightLeft className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                        className="p-0.5 rounded text-zinc-400 hover:text-rose-500"
                        title="Trash"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Trash Section */}
        <div className="pt-2 border-t border-zinc-200/40 dark:border-zinc-900">
          <div className="flex items-center justify-between px-3 py-1 text-[9px] font-bold text-zinc-505 dark:text-zinc-400 uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setIsTrashExpanded(!isTrashExpanded)}
              className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-200 transition text-left cursor-pointer"
            >
              {isTrashExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Trash2 className="h-3 w-3 text-rose-500/80" />
              <span>Trash ({trashNotes.length})</span>
            </button>
            {trashNotes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Permanently delete all notes in the trash? This action cannot be undone.')) {
                    onEmptyTrash();
                  }
                }}
                className="text-[9px] text-rose-550 dark:text-rose-400 hover:underline transition font-bold cursor-pointer"
                title="Permanently empty trash"
              >
                Clear All
              </button>
            )}
          </div>

          {isTrashExpanded && (
            <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto">
              {filteredTrashNotes.length === 0 ? (
                <p className="px-3 py-1 text-[10px] text-zinc-500 italic">Trash is empty</p>
              ) : (
                filteredTrashNotes.map(note => (
                  <div
                    key={note.id}
                    className={`group/trash flex items-center justify-between px-3 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                      activeNoteId === note.id
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-900/30 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                    onClick={() => onSelectNote(note.id)}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <span className="text-sm flex-shrink-0">{note.coverEmoji || '📄'}</span>
                      <span className="truncate">{note.title || 'Untitled Note'}</span>
                      <span className="text-[8px] text-zinc-500 font-mono flex-shrink-0 bg-zinc-950/20 px-1 py-0.5 rounded">
                        {getDaysLeft(note.deletedAt)} left
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 group-trash-hover:opacity-100 sm:opacity-0 transition ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreNote(note.id);
                        }}
                        className="p-1 rounded hover:opacity-100 text-emerald-500"
                        title="Restore Note"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Permanently delete this note? This action cannot be undone.')) {
                            onDeleteNotePermanently(note.id);
                          }
                        }}
                        className="p-1 rounded hover:opacity-100 text-rose-500"
                        title="Delete Permanently"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* PWA / Workspace footer (Minimalist) */}
      <div className={`p-4 border-t text-[10px] ${themeBorder}`}>
        {pwaInstallEvent && (
          <button
            onClick={onTriggerInstall}
            className="w-full bg-zinc-905 hover:bg-zinc-805 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-lg py-1.5 px-3 mb-2 font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Download className="h-3 w-3" />
            Install Desk App
          </button>
        )}
        <div className="flex flex-col gap-0.5 text-zinc-500">
          <div className="flex items-center justify-between">
            <span>Durable Storage</span>
            <span className="font-mono text-emerald-500 font-semibold uppercase text-[8px]">IndexDB OK</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Cloud Sync Status</span>
            <span className={`flex items-center gap-0.5 font-semibold text-[8px] uppercase ${user ? 'text-emerald-500' : 'text-zinc-500'}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`}></span>
              {user ? 'Online Active' : 'Offline'}
            </span>
          </div>
          <p className="mt-2 border-t border-zinc-200 dark:border-zinc-900 pt-1 text-[8px] text-zinc-450 dark:text-zinc-600 text-center select-none font-mono">
            ANotes Workspace • Minimal v2.0
          </p>
        </div>
      </div>

      {/* Move Folder Modal */}
      {noteToMove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`border rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4 ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <ArrowRightLeft className="h-4 w-4" />
                Move "{noteToMove.title || 'Untitled'}"
              </h3>
              <button
                onClick={() => setNoteToMove(null)}
                className="hover:opacity-60 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">Select which folder you'd like to place this note into:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <button
                onClick={() => {
                  onMoveNote(noteToMove.id, null);
                  setNoteToMove(null);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-left transition ${
                  noteToMove.folderId === null ? (isDark ? 'bg-zinc-950 font-semibold text-white' : 'bg-zinc-100 font-semibold text-zinc-950') : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                <FileText className="h-3.5 w-3.5 opacity-60" />
                <span>Quick Notes (No Folder)</span>
              </button>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => {
                    onMoveNote(noteToMove.id, folder.id);
                    setNoteToMove(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-left transition ${
                    noteToMove.folderId === folder.id ? (isDark ? 'bg-zinc-950 font-semibold text-white' : 'bg-zinc-100 font-semibold text-zinc-950') : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <FolderIcon className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{folder.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
