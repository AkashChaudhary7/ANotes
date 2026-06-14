import React, { useState } from 'react';
import { Note, Block } from '../types';
import {
  X,
  Share2,
  Printer,
  Sparkles,
  Layers,
  LayoutGrid,
  TrendingUp,
  Download
} from 'lucide-react';

interface MindMapRendererProps {
  note: Note;
  onClose: () => void;
}

interface TreeItem {
  id: string;
  label: string;
  type: string;
  children: TreeItem[];
}

export default function MindMapRenderer({ note, onClose }: MindMapRendererProps) {
  const [layoutStyle, setLayoutStyle] = useState<'bento' | 'split'>('split');

  // Parses the notes stream into a visual hierarchal tree structure
  const buildHierarchyFromNote = (title: string, blocks: Block[]): TreeItem => {
    const root: TreeItem = {
      id: 'root-map',
      label: title || 'Central Core Idea',
      type: 'root',
      children: []
    };

    let activeH2: TreeItem | null = null;

    blocks.forEach((block, idx) => {
      if (block.type === 'heading-1' || block.type === 'heading-2') {
        const text = block.content.replace(/<[^>]*>/g, '');
        if (text.trim() === '') return;

        const newBranch: TreeItem = {
          id: block.id,
          label: text,
          type: block.type,
          children: []
        };

        root.children.push(newBranch);
        activeH2 = newBranch;
      } else if (block.type === 'bullet-list-item' || block.type === 'numbered-list-item' || block.type === 'checklist-item') {
        const text = block.content.replace(/<[^>]*>/g, '');
        if (text.trim() === '') return;

        const leaf: TreeItem = {
          id: block.id,
          label: text,
          type: 'leaf',
          children: []
        };

        if (activeH2) {
          activeH2.children.push(leaf);
        } else {
          // If no heading is present yet, add to root
          root.children.push(leaf);
        }
      }
    });

    // Seed dummy fallbacks if hierarchy is empty
    if (root.children.length === 0) {
      root.children = [
        {
          id: 'fb1',
          label: 'Core Concept A',
          type: 'heading-2',
          children: [
            { id: 'fbl1', label: 'Primary characteristic details', type: 'leaf', children: [] },
            { id: 'fbl2', label: 'Secondary element references', type: 'leaf', children: [] }
          ]
        },
        {
          id: 'fb2',
          label: 'Supporting Category B',
          type: 'heading-2',
          children: [
            { id: 'fbl3', label: 'Factual metrics and references', type: 'leaf', children: [] }
          ]
        }
      ];
    }

    return root;
  };

  const mapData = buildHierarchyFromNote(note.title, note.blocks);

  const handlePrintMind = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6 z-50 select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header bar */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
            <div>
              <h2 className="font-sans font-bold text-sm text-white">Visual Mind Map Creator</h2>
              <p className="text-[10px] text-indigo-300 font-mono tracking-widest uppercase">Auto-Compiled Study Aid</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-800 p-0.5 text-xs font-semibold gap-1">
              <button
                onClick={() => setLayoutStyle('split')}
                className={`px-2.5 py-1 rounded transition ${layoutStyle === 'split' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Split Branches
              </button>
              <button
                onClick={() => setLayoutStyle('bento')}
                className={`px-2.5 py-1 rounded transition ${layoutStyle === 'bento' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Bento Hierarchies
              </button>
            </div>
            <button
              onClick={handlePrintMind}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-505 text-white hover:bg-indigo-500 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Map
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Outer container */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-radial from-slate-950 to-slate-900 select-none print:bg-white print:p-4">
          <div className="w-full flex flex-col items-center justify-center space-y-12">
            
            {/* Core Center Node */}
            <div className="text-center group select-none">
              <div className="inline-block bg-gradient-to-tr from-indigo-500 to-cyan-500 p-0.5 rounded-2xl shadow-xl ring-4 ring-indigo-500/20">
                <div className="bg-slate-950 rounded-[14px] px-8 py-4 font-bold tracking-tight text-white text-xl">
                  {mapData.label}
                </div>
              </div>
              <div className="h-10 w-0.5 bg-indigo-500/30 mx-auto mt-0.5"></div>
            </div>

            {/* Layout structures */}
            {layoutStyle === 'split' ? (
              // Split visual tree branches
              <div className="grid grid-cols-3 gap-6 w-full items-start px-4">
                {mapData.children.slice(0, 3).map((branch, bIdx) => (
                  <div key={branch.id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4.5 space-y-3 shadow shadow-slate-900 relative">
                    {/* Connective branch link indicator */}
                    <div className="absolute -top-6 left-1/2 w-0.5 h-6 bg-indigo-500/25"></div>
                    
                    <h3 className="text-sm font-bold text-center text-indigo-300 pb-2 border-b border-slate-800 tracking-wide uppercase">
                      {branch.label}
                    </h3>
                    
                    <div className="space-y-1.5">
                      {branch.children.length === 0 ? (
                        <p className="text-[10px] text-slate-500 text-center italic">No study terms</p>
                      ) : (
                        branch.children.map(leaf => (
                          <div key={leaf.id} className="flex items-start gap-1.5 text-xs text-slate-355 hover:text-white bg-slate-950/40 p-1.5 rounded border border-slate-800/40 font-medium">
                            <span className="text-cyan-400 font-mono select-none">├──</span>
                            <span className="truncate">{leaf.label}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Bento board representations
              <div className="grid grid-cols-2 gap-4 w-full px-6">
                {mapData.children.slice(0, 4).map((branch) => (
                  <div key={branch.id} className="bg-slate-900 p-5 rounded-2xl border border-indigo-550/15 text-left shadow-lg scale-99 hover:scale-100 transition-all">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-400 text-xs uppercase tracking-widest pb-3 border-b border-slate-800">
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span>{branch.label}</span>
                    </div>
                    <div className="mt-3.5 space-y-1.5">
                      {branch.children.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">No notes items</p>
                      ) : (
                        branch.children.map(leaf => (
                          <div key={leaf.id} className="flex items-center gap-1.5 text-xs text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            <span>{leaf.label}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hint / Study metrics indicator */}
            <div className="p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl max-w-md w-full flex items-center justify-center gap-2 text-[10px] text-indigo-400 font-mono tracking-wide uppercase font-semibold">
              <Layers className="h-3.5 w-3.5" />
              <span>Hierarchical mapping extracted from active headings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
