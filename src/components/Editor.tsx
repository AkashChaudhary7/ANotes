import React, { useState, useRef, useEffect } from 'react';
import { Note, Block } from '../types';
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layout,
  Code,
  Image as ImageIcon,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Type,
  List,
  ListOrdered,
  CheckSquare,
  AlertCircle,
  HelpCircle,
  Hash,
  Sparkles,
  Link2,
  Check,
  ChevronRight,
  Calculator,
  Grid,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Palette,
  Minus,
  Pin,
  Download,
  Cloud,
  RefreshCw,
  Tag,
  X,
  MoreHorizontal,
  ClipboardList,
  BookOpen,
  Edit,
  Languages,
  Network,
  FileText,
  PenTool
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ContentEditable } from './ContentEditable';

interface ParsedMarkdownTable {
  headers: string[];
  rows: string[][];
  alignments: ('left' | 'center' | 'right')[];
}

export const parseMarkdownTable = (markdown: string): ParsedMarkdownTable | null => {
  if (!markdown) return null;
  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  const tableLines = lines.filter(l => l.startsWith('|') && l.endsWith('|'));
  if (tableLines.length < 2) return null;

  const parseRow = (line: string): string[] => {
    const parts = line.split('|');
    if (parts.length > 1) {
      parts.shift();
      parts.pop();
    }
    return parts.map(p => p.trim());
  };

  const headers = parseRow(tableLines[0]);
  if (headers.length === 0) return null;

  const delimiterRow = parseRow(tableLines[1]);
  const isDelimiter = delimiterRow.length > 0 && delimiterRow.every(col => /^[:-]+$/.test(col));
  if (!isDelimiter) return null;

  const alignments = delimiterRow.map(col => {
    const left = col.startsWith(':');
    const right = col.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });

  const rows: string[][] = [];
  for (let i = 2; i < tableLines.length; i++) {
    const row = parseRow(tableLines[i]);
    while (row.length < headers.length) {
      row.push('');
    }
    rows.push(row.slice(0, headers.length));
  }

  return { headers, rows, alignments };
};

interface EditorProps {
  note: Note;
  onUpdateNote: (updatedNote: Note) => void;
  onRestoreNote: (noteId: string) => void;
  onDeletePermanently: (noteId: string) => void;
  onOpenPdfExporter: () => void;
  onOpenMindMap: () => void;
}

const POPULAR_EMOJIS = [
  '📚', '🌍', '🧠', '📜', '⚖️', '🧠', '🧬', '🔬', '✍️', '📂',
  '🏡', '🎨', '📅', '🍎', '💡', '🎒', '⭐', '🔥', '📌', '🏆',
  '💻', '🎧', '⚡', '✨', '✔️', '🛠️', '🔑', '🔓', '💭', '💬'
];

const COVER_GRADIENTS = [
  { css: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', name: 'Academic Blue' },
  { css: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)', name: 'Forest Teal' },
  { css: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', name: 'Royal Purple' },
  { css: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)', name: 'Sunset Gold' },
  { css: 'linear-gradient(135deg, #b91c1c 0%, #f87171 100%)', name: 'Cherry Crimson' },
  { css: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', name: 'Slate Dark' },
  { css: 'linear-gradient(135deg, #be185d 0%, #f472b6 100%)', name: 'Cosmic Pink' },
  { css: '', name: 'No Cover' }
];

export default function Editor({
  note: externalNote,
  onUpdateNote: triggerExternalUpdate,
  onRestoreNote,
  onDeletePermanently,
  onOpenPdfExporter,
  onOpenMindMap
}: EditorProps) {
  const [note, setNote] = useState<Note>(externalNote);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [activeBlockMenu, setActiveBlockMenu] = useState<string | null>(null);
  const [slashCommandIndex, setSlashCommandIndex] = useState<{ blockId: string; query: string } | null>(null);
  const [isReadMode, setIsReadMode] = useState(false);
  
  const [syncState, setSyncState] = useState<'saved' | 'saving'>('saved');
  const [newTagInput, setNewTagInput] = useState('');
  const [activeTableCellMenu, setActiveTableCellMenu] = useState<{
    blockId: string;
    rIdx: number;
    cIdx: number;
  } | null>(null);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);

  // Zoomable visual lightbox and gallery state definitions
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [showFloatingTOC, setShowFloatingTOC] = useState(false);

  // Drag and drop block reordering states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hoveredHandleBlockId, setHoveredHandleBlockId] = useState<string | null>(null);

  // Markdown-compatible table modes (raw-markdown editor vs interactive table)
  const [editingMdTableBlockId, setEditingMdTableBlockId] = useState<string | null>(null);

  // AI Premium Writing Assistant & Schematic Diagram feature states
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiSelectedAction, setAiSelectedAction] = useState<'summarize' | 'enhance' | 'expand' | 'simplify' | 'translate_academic' | 'concept-diagram'>('summarize');
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [aiOutput, setAiOutput] = useState('');
  const [aiErrorMsg, setAiErrorMsg] = useState('');
  const [aiSelectedBlockId, setAiSelectedBlockId] = useState<string | null>(null);

  // Synchronization references to auto-save of note upon switching documents
  const lastStateRef = useRef<{ note: Note; isDirty: boolean }>({
    note,
    isDirty: false
  });

  useEffect(() => {
    lastStateRef.current = { note, isDirty: syncState === 'saving' };
  }, [note, syncState]);

  useEffect(() => {
    setNote(externalNote);
  }, [externalNote.id, externalNote.isDeleted, externalNote.pinned]);

  useEffect(() => {
    return () => {
      const { note: lastNote, isDirty } = lastStateRef.current;
      if (isDirty) {
        triggerExternalUpdate(lastNote);
      }
    };
  }, [externalNote.id, triggerExternalUpdate]);

  // Debounce effect triggering local alterations to the parent db
  useEffect(() => {
    if (note.id !== externalNote.id) return;

    if (note === externalNote) {
      setSyncState('saved');
      return;
    }

    setSyncState('saving');
    const timer = setTimeout(() => {
      triggerExternalUpdate(note);
      setSyncState('saved');
    }, 1200);

    return () => clearTimeout(timer);
  }, [note, externalNote, triggerExternalUpdate]);

  const onUpdateNote = (updatedNote: Note) => {
    setNote(updatedNote);
  };

  const applyTemplate = (templateType: 'weekly' | 'project' | 'study') => {
    let templateBlocks: Block[] = [];
    const makeId = () => 'b-' + Math.random().toString(36).substr(2, 9);
    
    if (templateType === 'weekly') {
      templateBlocks = [
        {
          id: makeId(),
          type: 'heading-1',
          content: 'Weekly Planner 📅'
        },
        {
          id: makeId(),
          type: 'callout',
          content: 'Set your high-priority goals for the week and track daily execution below. Realize your potential step-by-step!'
        },
        {
          id: makeId(),
          type: 'heading-2',
          content: 'Goals & Focus Highlights 🎯'
        },
        {
          id: makeId(),
          type: 'checklist-item',
          content: 'Goal 1: Design and wireframe product dashboard MVP',
          checked: false
        },
        {
          id: makeId(),
          type: 'checklist-item',
          content: 'Goal 2: Conduct live feedback sessions with 3 core users',
          checked: false
        },
        {
          id: makeId(),
          type: 'divider',
          content: ''
        },
        {
          id: makeId(),
          type: 'heading-2',
          content: 'Weekly Agenda & Tracker 🗓️'
        },
        {
          id: makeId(),
          type: 'table',
          content: '',
          tableData: [
            ['Day Indicator', 'Focus Responsibilities', 'Implementation Status'],
            ['Monday', 'System design overhaul & layout coding', 'In Progress'],
            ['Tuesday', 'State workflow integration & API mocking', 'Not Started'],
            ['Wednesday', 'User feedback capture & refinement loops', 'Not Started'],
            ['Thursday', 'Test deployments & benchmark validations', 'Not Started'],
            ['Friday', 'Retrospective summary and weekly documentation', 'Not Started']
          ]
        },
        {
          id: makeId(),
          type: 'checklist-item',
          content: 'Conduct weekly progress alignment of outcomes',
          checked: false
        }
      ];
    } else if (templateType === 'project') {
      templateBlocks = [
        {
          id: makeId(),
          type: 'heading-1',
          content: 'Project Outline 🚀'
        },
        {
          id: makeId(),
          type: 'callout',
          content: 'Deconstruct your workspace goals, project constraints, timeline milestones, and task flow elements.'
        },
        {
          id: makeId(),
          type: 'heading-2',
          content: 'Core Objectives & Context 📌'
        },
        {
          id: makeId(),
          type: 'paragraph',
          content: 'Enter details explaining the primary problem statement, user empathy insights, and success metrics.'
        },
        {
          id: makeId(),
          type: 'heading-2',
          content: 'Phase-Wise Timeline ⏰'
        },
        {
          id: makeId(),
          type: 'table',
          content: '',
          tableData: [
            ['Milestone Name', 'Target Interval', 'Responsible Owner'],
            ['Pre-Scoping & Requirements Check', 'Week 1', 'Product Strategy Lead'],
            ['System Prototyping & Backend Init', 'Week 2', 'Engineering Specialist'],
            ['Core Integration & Flow Testing', 'Week 3', 'Quality Assurance team'],
            ['Beta Deploy, Analytics & Evaluation', 'Week 4', 'Marketing & Ops Team']
          ]
        },
        {
          id: makeId(),
          type: 'heading-2',
          content: 'Launch Readiness Checklist ✅'
        },
        {
          id: makeId(),
          type: 'checklist-item',
          content: 'Lock product definition scope and review API contracts',
          checked: true
        },
        {
          id: makeId(),
          type: 'checklist-item',
          content: 'Publish documentation specs and code guidelines',
          checked: false
        }
      ];
    } else if (templateType === 'study') {
      templateBlocks = [
        {
          id: makeId(),
          type: 'heading-1',
          content: 'Study Summary Notes 📖'
        },
        {
          id: makeId(),
          type: 'callout',
          content: 'Synthesize research topics, summarize critical equations, and craft active recall questions.'
        },
        {
          id: makeId(),
          type: 'heading-2',
          content: 'Theoretical Concepts & Core Definitions 💡'
        },
        {
          id: makeId(),
          type: 'highlight-box',
          content: 'Fundamental Principle: The cognitive storage capacity is optimal when concepts are broken down into self-contained units.',
          highlightType: 'important'
        },
        {
          id: makeId(),
          type: 'heading-2',
          content: 'Q&A Active Recall Prompts 📝'
        },
        {
          id: makeId(),
          type: 'checklist-item',
          content: 'Active Prompt 1: Explain the primary constraints under which this theorem applies',
          checked: false
        },
        {
          id: makeId(),
          type: 'checklist-item',
          content: 'Active Prompt 2: Outline three real-world edge cases of structural failure',
          checked: false
        },
        {
          id: makeId(),
          type: 'divider',
          content: ''
        },
        {
          id: makeId(),
          type: 'heading-2',
          content: 'Bibliography & Reference Mapping 🔗'
        },
        {
          id: makeId(),
          type: 'paragraph',
          content: 'Organize research citation URLs, external references, and appendix calculations here.'
        }
      ];
    }

    if (note.blocks.length > 1 || (note.blocks[0] && note.blocks[0].content !== '')) {
      const confirmReplace = window.confirm('Are you sure you want to insert this template? It will replace all existing blocks in this note.');
      if (!confirmReplace) return;
    }

    onUpdateNote({
      ...note,
      title: templateType === 'weekly' ? 'Weekly Planner' : templateType === 'project' ? 'Project Outline' : 'Study Summary',
      blocks: templateBlocks,
      updatedAt: Date.now()
    });
    setShowTemplatesDropdown(false);
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!trimmed) return;
    const currentTags = note.tags || [];
    if (!currentTags.includes(trimmed)) {
      onUpdateNote({
        ...note,
        tags: [...currentTags, trimmed],
        updatedAt: Date.now()
      });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = note.tags || [];
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    onUpdateNote({
      ...note,
      tags: updatedTags,
      updatedAt: Date.now()
    });
  };

  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Helper to trigger save/update
  const updateNoteTitle = (newTitle: string) => {
    onUpdateNote({
      ...note,
      title: newTitle,
      updatedAt: Date.now()
    });
  };

  const handleTogglePin = () => {
    const updated = {
      ...note,
      pinned: !note.pinned,
      updatedAt: Date.now()
    };
    setNote(updated);
    triggerExternalUpdate(updated);
  };

  const handleExportMarkdown = () => {
    let md = '';
    if (note.coverEmoji) {
      md += `# ${note.coverEmoji} ${note.title || 'Untitled Note'}\n\n`;
    } else {
      md += `# ${note.title || 'Untitled Note'}\n\n`;
    }
    note.blocks.forEach(block => {
      switch (block.type) {
        case 'heading-1':
          md += `# ${block.content}\n\n`;
          break;
        case 'heading-2':
          md += `## ${block.content}\n\n`;
          break;
        case 'heading-3':
          md += `### ${block.content}\n\n`;
          break;
        case 'heading-4':
          md += `#### ${block.content}\n\n`;
          break;
        case 'paragraph':
          md += `${block.content}\n\n`;
          break;
        case 'bullet-list-item':
          md += `- ${block.content}\n`;
          break;
        case 'numbered-list-item':
          md += `1. ${block.content}\n`;
          break;
        case 'checklist-item':
          md += `- [${block.checked ? 'x' : ' '}] ${block.content}\n`;
          break;
        case 'quote':
          md += `> ${block.content}\n\n`;
          break;
        case 'divider':
          md += `---\n\n`;
          break;
        case 'code':
          md += `\`\`\`${block.codeLanguage || 'text'}\n${block.content}\n\`\`\`\n\n`;
          break;
        case 'callout':
        case 'highlight-box':
          md += `> **[${block.highlightType || 'NOTE'}]**: ${block.content}\n\n`;
          break;
        case 'formula':
          md += `$$\n${block.formulaTex || block.content}\n$$\n\n`;
          break;
        case 'image':
          md += `![${block.imageCaption || 'Image'}](${block.imageSrc || ''})\n\n`;
          break;
        case 'table':
          if (block.tableData && block.tableData.length > 0) {
            block.tableData.forEach((row, rIdx) => {
              md += `| ${row.join(' | ')} |\n`;
              if (rIdx === 0) {
                const divider = row.map(() => '---');
                md += `| ${divider.join(' | ')} |\n`;
              }
            });
            md += `\n`;
          }
          break;
        case 'markdown-table':
          md += `${block.content}\n\n`;
          break;
        default:
          md += `${block.content}\n\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const safeTitle = (note.title || 'untitled').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    
    link.setAttribute('download', `${safeTitle || 'note'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const updateEmoji = (emoji: string) => {
    onUpdateNote({
      ...note,
      coverEmoji: emoji,
      updatedAt: Date.now()
    });
    setShowEmojiPicker(false);
  };

  const updateCover = (gradient: string) => {
    onUpdateNote({
      ...note,
      coverImage: gradient || null,
      updatedAt: Date.now()
    });
    setShowCoverPicker(false);
  };

  // Block manipulations
  const handleBlockChange = (blockId: string, updatedFields: Partial<Block>) => {
    const nextBlocks = note.blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, ...updatedFields };
      }
      return b;
    });

    onUpdateNote({
      ...note,
      blocks: nextBlocks,
      updatedAt: Date.now()
    });
  };

  const addBlock = (type: Block['type'] = 'paragraph', afterId?: string) => {
    const newBlock: Block = {
      id: 'b-' + Math.random().toString(36).substr(2, 9),
      type,
      content: '',
    };

    if (type === 'table') {
      newBlock.tableData = [
        ['Header 1', 'Header 2', 'Header 3'],
        ['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3'],
        ['Row 2 Col 1', 'Row 2 Col 2', 'Row 2 Col 3'],
      ];
    } else if (type === 'markdown-table') {
      newBlock.content = `| Item | Qty | Price |
| :--- | :---: | ---: |
| Notebook | 2 | $4.99 |
| Pen | 5 | $1.20 |`;
    } else if (type === 'highlight-box') {
      newBlock.highlightType = 'important';
      newBlock.content = 'Write important point here...';
    } else if (type === 'code') {
      newBlock.codeLanguage = 'javascript';
    } else if (type === 'formula') {
      newBlock.formulaTex = 'E = mc^2';
      newBlock.content = 'E = mc²';
    } else if (type === 'image') {
      newBlock.imageSrc = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';
      newBlock.imageCaption = 'Study desk mockup illustration';
    }

    let nextBlocks: Block[] = [];
    if (afterId) {
      const index = note.blocks.findIndex(b => b.id === afterId);
      if (index !== -1) {
        nextBlocks = [...note.blocks];
        nextBlocks.splice(index + 1, 0, newBlock);
      } else {
        nextBlocks = [...note.blocks, newBlock];
      }
    } else {
      nextBlocks = [...note.blocks, newBlock];
    }

    onUpdateNote({
      ...note,
      blocks: nextBlocks,
      updatedAt: Date.now()
    });
  };

  const deleteBlock = (blockId: string) => {
    // Keep at least one paragraph block if we deleted all
    let nextBlocks = note.blocks.filter(b => b.id !== blockId);
    if (nextBlocks.length === 0) {
      nextBlocks = [{ id: 'b-default', type: 'paragraph', content: '' }];
    }

    onUpdateNote({
      ...note,
      blocks: nextBlocks,
      updatedAt: Date.now()
    });
    setActiveBlockMenu(null);
  };

  const handleAiAction = async (overrideAction?: typeof aiSelectedAction, overrideBlockId?: string | null) => {
    const targetAction = overrideAction || aiSelectedAction;
    const targetBlockId = overrideBlockId !== undefined ? overrideBlockId : aiSelectedBlockId;
    
    let textToProcess = '';
    
    if (targetAction === 'summarize') {
      textToProcess = note.blocks.map(b => b.content).filter(Boolean).join('\n');
    } else {
      if (targetBlockId) {
        const blk = note.blocks.find(b => b.id === targetBlockId);
        textToProcess = blk ? blk.content : '';
      } else {
        // use last edited / first non-empty block content
        const firstWithContent = note.blocks.find(b => b.content.trim().length > 0);
        textToProcess = firstWithContent ? firstWithContent.content : '';
      }
    }

    if (!textToProcess.trim()) {
      setAiStatus('error');
      setAiErrorMsg('There is no content text to process. Please select a block with text or write something first.');
      return;
    }

    setAiStatus('loading');
    setAiErrorMsg('');
    setAiOutput('');

    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: textToProcess,
          action: targetAction,
          contextNoteTitle: note.title
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI processing request failed');
      }

      setAiOutput(data.output);
      setAiStatus('success');
    } catch (err: any) {
      console.error(err);
      setAiStatus('error');
      setAiErrorMsg(err?.message || 'Failed to communicate with Gemini API. Verify internet status or secret key configuration.');
    }
  };

  const applyAiOutput = (insertMode: 'replace' | 'insert_below' | 'append_end') => {
    if (!aiOutput) return;

    if (insertMode === 'replace' && aiSelectedBlockId) {
      const nextBlocks = note.blocks.map(b => {
        if (b.id === aiSelectedBlockId) {
          return { ...b, content: aiOutput };
        }
        return b;
      });
      onUpdateNote({
        ...note,
        blocks: nextBlocks,
        updatedAt: Date.now()
      });
    } else if (insertMode === 'insert_below' && aiSelectedBlockId) {
      const index = note.blocks.findIndex(b => b.id === aiSelectedBlockId);
      if (index !== -1) {
        const newBlock: Block = {
          id: 'b-' + Math.random().toString(36).substr(2, 9),
          type: 'paragraph',
          content: aiOutput
        };
        const nextBlocks = [...note.blocks];
        nextBlocks.splice(index + 1, 0, newBlock);
        onUpdateNote({
          ...note,
          blocks: nextBlocks,
          updatedAt: Date.now()
        });
      }
    } else {
      // Append End
      const newBlock: Block = {
        id: 'b-' + Math.random().toString(36).substr(2, 9),
        type: 'paragraph',
        content: aiOutput
      };
      onUpdateNote({
        ...note,
        blocks: [...note.blocks, newBlock],
        updatedAt: Date.now()
      });
    }
    // Close panel with success feedback
    setIsAiPanelOpen(false);
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = note.blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === note.blocks.length - 1) return;

    const nextBlocks = [...note.blocks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = nextBlocks[index];
    nextBlocks[index] = nextBlocks[targetIdx];
    nextBlocks[targetIdx] = temp;

    onUpdateNote({
      ...note,
      blocks: nextBlocks,
      updatedAt: Date.now()
    });
    setActiveBlockMenu(null);
  };

  const handleBlockDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const nextBlocks = [...note.blocks];
    const [removed] = nextBlocks.splice(draggedIndex, 1);
    nextBlocks.splice(targetIndex, 0, removed);

    onUpdateNote({
      ...note,
      blocks: nextBlocks,
      updatedAt: Date.now()
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const convertBlock = (blockId: string, newType: Block['type']) => {
    const nextBlocks = note.blocks.map(b => {
      if (b.id === blockId) {
        const updated: Block = { ...b, type: newType };
        if (newType === 'table' && !updated.tableData) {
          updated.tableData = [['Cell A', 'Cell B'], ['Cell C', 'Cell D']];
        } else if (newType === 'markdown-table' && !updated.content) {
          updated.content = `| Item | Value |\n| :--- | ---: |\n| Sample A | $10 |`;
        } else if (newType === 'highlight-box' && !updated.highlightType) {
          updated.highlightType = 'important';
        } else if (newType === 'code' && !updated.codeLanguage) {
          updated.codeLanguage = 'javascript';
        } else if (newType === 'formula' && !updated.formulaTex) {
          updated.formulaTex = b.content || 'PV = nRT';
          updated.content = b.content || 'PV = nRT';
        } else if (newType === 'image' && !updated.imageSrc) {
          updated.imageSrc = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';
          updated.imageCaption = 'Study desk mockup illustration';
        }
        return updated;
      }
      return b;
    });

    onUpdateNote({
      ...note,
      blocks: nextBlocks,
      updatedAt: Date.now()
    });
    setActiveBlockMenu(null);
  };

  // Table cell helpers
  const handleTableCellChange = (blockId: string, rIdx: number, cIdx: number, val: string) => {
    const block = note.blocks.find(b => b.id === blockId);
    if (!block || !block.tableData) return;

    const nextTableData = block.tableData.map((row, r) => {
      if (r === rIdx) {
        return row.map((cell, c) => (c === cIdx ? val : cell));
      }
      return row;
    });

    handleBlockChange(blockId, { tableData: nextTableData });
  };

  const addTableRow = (blockId: string) => {
    const block = note.blocks.find(b => b.id === blockId);
    if (!block || !block.tableData) return;
    const colsCount = block.tableData[0]?.length || 2;
    const newRow = Array(colsCount).fill('');
    handleBlockChange(blockId, { tableData: [...block.tableData, newRow] });
  };

  const addTableRowAbove = (blockId: string, rIdx: number) => {
    const block = note.blocks.find(b => b.id === blockId);
    if (!block || !block.tableData) return;
    const colsCount = block.tableData[0]?.length || 2;
    const newRow = Array(colsCount).fill('');
    const nextTable = [...block.tableData];
    nextTable.splice(rIdx, 0, newRow);
    handleBlockChange(blockId, { tableData: nextTable });
  };

  const addTableRowBelow = (blockId: string, rIdx: number) => {
    const block = note.blocks.find(b => b.id === blockId);
    if (!block || !block.tableData) return;
    const colsCount = block.tableData[0]?.length || 2;
    const newRow = Array(colsCount).fill('');
    const nextTable = [...block.tableData];
    nextTable.splice(rIdx + 1, 0, newRow);
    handleBlockChange(blockId, { tableData: nextTable });
  };

  const addTableCol = (blockId: string) => {
    const block = note.blocks.find(b => b.id === blockId);
    if (!block || !block.tableData) return;
    const nextTableData = block.tableData.map(row => [...row, '']);
    handleBlockChange(blockId, { tableData: nextTableData });
  };

  const addTableColLeft = (blockId: string, cIdx: number) => {
    const block = note.blocks.find(b => b.id === blockId);
    if (!block || !block.tableData) return;
    const nextTableData = block.tableData.map(row => {
      const nextRow = [...row];
      nextRow.splice(cIdx, 0, '');
      return nextRow;
    });
    handleBlockChange(blockId, { tableData: nextTableData });
  };

  const addTableColRight = (blockId: string, cIdx: number) => {
    const block = note.blocks.find(b => b.id === blockId);
    if (!block || !block.tableData) return;
    const nextTableData = block.tableData.map(row => {
      const nextRow = [...row];
      nextRow.splice(cIdx + 1, 0, '');
      return nextRow;
    });
    handleBlockChange(blockId, { tableData: nextTableData });
  };

  const removeTableRow = (blockId: string, index: number) => {
    const block = note.blocks.find(b => b.id === blockId);
    if (!block || !block.tableData || block.tableData.length <= 1) return;
    const nextTable = block.tableData.filter((_, i) => i !== index);
    handleBlockChange(blockId, { tableData: nextTable });
  };

  const removeTableCol = (blockId: string, index: number) => {
    const block = note.blocks.find(b => b.id === blockId);
    if (!block || !block.tableData || block.tableData[0].length <= 1) return;
    const nextTable = block.tableData.map(row => row.filter((_, i) => i !== index));
    handleBlockChange(blockId, { tableData: nextTable });
  };

  // Keyboard shortcut routing & Slash command detection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, block: Block) => {
    if (e.key === 'Enter') {
      if (slashCommandIndex && slashCommandIndex.blockId === block.id) {
        // Cancel slash command if Enter is pressed
        setSlashCommandIndex(null);
      } else if (!e.shiftKey) {
        e.preventDefault();
        // Insert empty paragraph after active block
        addBlock('paragraph', block.id);
        // Focus the newly added item if possible after state updates
        setTimeout(() => {
          const index = note.blocks.findIndex(b => b.id === block.id);
          if (index !== -1 && note.blocks[index + 1]) {
            const nextId = note.blocks[index + 1].id;
            const el = document.getElementById(`editable-${nextId}`);
            el?.focus();
          }
        }, 50);
      }
    } else if (e.key === 'Backspace' && block.content === '') {
      // Remove block if backspace is pressed on empty content (except if it is the only block)
      if (note.blocks.length > 1) {
        e.preventDefault();
        const index = note.blocks.findIndex(b => b.id === block.id);
        deleteBlock(block.id);
        // Focus previous block
        setTimeout(() => {
          const prevIdx = index > 0 ? index - 1 : 0;
          const prevBlock = note.blocks[prevIdx];
          if (prevBlock) {
            const el = document.getElementById(`editable-${prevBlock.id}`);
            el?.focus();
          }
        }, 50);
      }
    }
  };

  const handleInputText = (e: React.FormEvent<HTMLDivElement>, blockId: string) => {
    const value = e.currentTarget.innerHTML;
    const textValue = e.currentTarget.innerText;

    // Detect Slash commands in paragraph blocks
    const paragraphBlock = note.blocks.find(b => b.id === blockId);
    if (paragraphBlock && (paragraphBlock.type === 'paragraph' || paragraphBlock.type.includes('heading') || paragraphBlock.type.includes('list'))) {
      if (textValue.endsWith('/')) {
        setSlashCommandIndex({ blockId, query: '' });
      } else if (slashCommandIndex && slashCommandIndex.blockId === blockId) {
        const parts = textValue.split('/');
        const query = parts[parts.length - 1];
        if (textValue.indexOf('/') === -1) {
          setSlashCommandIndex(null);
        } else {
          setSlashCommandIndex({ blockId, query });
        }
      }
    }

    handleBlockChange(blockId, { content: value });
  };

  const applySlashCommand = (blockId: string, blockType: Block['type']) => {
    // Strip the slash character out of the content
    const block = note.blocks.find(b => b.id === blockId);
    if (block) {
      let cleanContent = block.content.replace(/\/([a-zA-Z0-9\s]*)$/, '');
      cleanContent = cleanContent.replace('/', ''); // fallback double check
      convertBlock(blockId, blockType);
      handleBlockChange(blockId, { content: cleanContent });
    }
    setSlashCommandIndex(null);
  };

  // Inline styling shortcuts (Bold, Italic, Underline)
  const formatText = (style: string) => {
    document.execCommand(style, false);
  };

  const formatTextColorAndHighlight = (command: string, value: string) => {
    document.execCommand(command, false, value);
  };

  const slashCommandMenuOptions = [
    { type: 'heading-1', label: 'Heading 1', desc: 'Big section heading', icon: <Heading1 className="h-4 w-4" /> },
    { type: 'heading-2', label: 'Heading 2', desc: 'Medium section heading', icon: <Heading2 className="h-4 w-4" /> },
    { type: 'heading-3', label: 'Heading 3', desc: 'Small subsection heading', icon: <Heading3 className="h-4 w-4" /> },
    { type: 'image', label: 'Image Frame', desc: 'Insert web image illustration', icon: <ImageIcon className="h-4 w-4" /> },
    { type: 'bullet-list-item', label: 'Bullet List', desc: 'Simple bulleted list', icon: <List className="h-4 w-4" /> },
    { type: 'numbered-list-item', label: 'Numbered List', desc: 'Ordered list sequence', icon: <ListOrdered className="h-4 w-4" /> },
    { type: 'checklist-item', label: 'Checklist', desc: 'Checklist with status toggles', icon: <CheckSquare className="h-4 w-4" /> },
    { type: 'quote', label: 'Quote', desc: 'Quote text highlight layout', icon: <Quote className="h-4 w-4" /> },
    { type: 'callout', label: 'Callout', desc: 'Emoji alert box', icon: <AlertCircle className="h-4 w-4" /> },
    { type: 'table', label: 'Table Grid', desc: 'Custom tabular content', icon: <Grid className="h-4 w-4" /> },
    { type: 'markdown-table', label: 'Markdown Table', desc: 'GFM Markdown-compatible table', icon: <Grid className="h-4 w-4 text-emerald-500" /> },
    { type: 'formula', label: 'Math Formula', desc: 'Premium style formula equation', icon: <Calculator className="h-4 w-4" /> },
    { type: 'code', label: 'Code Block', desc: 'Monospace code block', icon: <Code className="h-4 w-4" /> },
    { type: 'highlight-box', label: 'Study Point Box', desc: 'Highlight exam-points', icon: <Sparkles className="h-4 w-4 text-amber-500" /> },
    { type: 'divider', label: 'Divider line', desc: 'Horizontal separation line', icon: <Minus className="h-4 w-4" /> },
  ] as const;

  // Render different block structures
  const renderBlockItem = (block: Block, index: number) => {
    const isMenuOpen = activeBlockMenu === block.id;

    return (
      <div
        key={block.id}
        className={`relative group/block flex items-start py-1 select-text transition-all duration-150 ${isReadMode ? 'pl-0' : 'pl-11 md:pl-16 md:-ml-16'} ${
          draggedIndex === index ? 'opacity-35 bg-indigo-50/10 border-dashed border border-indigo-300 rounded-lg scale-[0.98]' : ''
        } ${
          dragOverIndex === index ? 'border-t-2 border-indigo-500 pt-2.5 bg-indigo-50/30' : ''
        }`}
        draggable={!isReadMode && hoveredHandleBlockId === block.id}
        onDragStart={(e) => {
          setDraggedIndex(index);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
          }
        }}
        onDragEnd={() => {
          setDraggedIndex(null);
          setDragOverIndex(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleBlockDrop(index);
        }}
      >
        {/* Hover drag/menu handles */}
        {!isReadMode && (
          <div className="absolute left-1.5 md:left-3 top-2 flex items-center gap-0.5 opacity-100 md:opacity-0 group-hover/block:opacity-100 transition z-20">
            <button
              onClick={() => addBlock('paragraph', block.id)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition hidden sm:inline-flex"
              title="Add Block Below"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setAiSelectedBlockId(block.id);
                setIsAiPanelOpen(true);
                setAiStatus('idle');
              }}
              className="p-1 rounded text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title="Open Block in AI Assistant"
            >
              <Sparkles className="h-3.5 w-3.5 fill-indigo-50/50" />
            </button>
            <div className="relative">
              <button
                onClick={() => setActiveBlockMenu(isMenuOpen ? null : block.id)}
                onMouseEnter={() => setHoveredHandleBlockId(block.id)}
                onMouseLeave={() => setHoveredHandleBlockId(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-grab active:cursor-grabbing"
                title="Drag to reorder / Block Options"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
              {isMenuOpen && (
                <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 text-xs text-slate-700">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold border-b border-gray-100">
                    Block Actions
                  </div>
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, 'up')}
                    disabled={index === 0}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <span>Move block up</span>
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, 'down')}
                    disabled={index === note.blocks.length - 1}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between disabled:opacity-50"
                  >
                    <span>Move block down</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBlock(block.id)}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center justify-between"
                  >
                    <span>Delete block</span>
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold border-t border-b border-gray-100 mt-1">
                    Convert To
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {slashCommandMenuOptions.map(option => (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => convertBlock(block.id, option.type)}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
                      >
                        {option.icon}
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Core block contents */}
        <div className="w-full select-text max-w-full">
          {(() => {
            switch (block.type) {
              case 'heading-1':
                return (
                  <ContentEditable
                    id={`editable-${block.id}`}
                    disabled={isReadMode}
                    onKeyDown={e => handleKeyDown(e, block)}
                    onInput={e => handleInputText(e, block.id)}
                    className="text-3xl font-sans font-bold tracking-tight text-gray-900 mt-5 mb-2 outline-none w-full"
                    placeholder={isReadMode ? "" : "Heading 1"}
                    html={block.content}
                  />
                );
              case 'heading-2':
                return (
                  <ContentEditable
                    id={`editable-${block.id}`}
                    disabled={isReadMode}
                    onKeyDown={e => handleKeyDown(e, block)}
                    onInput={e => handleInputText(e, block.id)}
                    className="text-2xl font-sans font-semibold tracking-tight text-gray-800 mt-4 mb-2 outline-none w-full"
                    placeholder={isReadMode ? "" : "Heading 2"}
                    html={block.content}
                  />
                );
              case 'heading-3':
                return (
                  <ContentEditable
                    id={`editable-${block.id}`}
                    disabled={isReadMode}
                    onKeyDown={e => handleKeyDown(e, block)}
                    onInput={e => handleInputText(e, block.id)}
                    className="text-xl font-sans font-semibold tracking-tight text-gray-800 mt-3 mb-2 outline-none w-full"
                    placeholder={isReadMode ? "" : "Heading 3"}
                    html={block.content}
                  />
                );
              case 'heading-4':
                return (
                  <ContentEditable
                    id={`editable-${block.id}`}
                    disabled={isReadMode}
                    onKeyDown={e => handleKeyDown(e, block)}
                    onInput={e => handleInputText(e, block.id)}
                    className="text-lg font-sans font-medium tracking-tight text-gray-700 mt-2.5 mb-1.5 outline-none w-full"
                    placeholder={isReadMode ? "" : "Heading 4"}
                    html={block.content}
                  />
                );
              case 'bullet-list-item':
                return (
                  <div className="flex items-start gap-2.5 my-1 w-full">
                    <span className="text-gray-400 select-none mt-1.5 font-sans font-bold">•</span>
                    <ContentEditable
                      id={`editable-${block.id}`}
                      disabled={isReadMode}
                      onKeyDown={e => handleKeyDown(e, block)}
                      onInput={e => handleInputText(e, block.id)}
                      className="w-full text-base font-sans text-gray-700 outline-none"
                      placeholder={isReadMode ? "" : "List item"}
                      html={block.content}
                    />
                  </div>
                );
              case 'numbered-list-item':
                return (
                  <div className="flex items-start gap-2 my-1 w-full">
                    <span className="text-indigo-500 font-mono text-sm tracking-tighter select-none mt-1 min-w-[15px] text-right">
                      {(note.blocks.slice(0, index).filter(b => b.type === 'numbered-list-item').length + 1)}.
                    </span>
                    <ContentEditable
                      id={`editable-${block.id}`}
                      disabled={isReadMode}
                      onKeyDown={e => handleKeyDown(e, block)}
                      onInput={e => handleInputText(e, block.id)}
                      className="w-full text-base font-sans text-gray-700 outline-none"
                      placeholder={isReadMode ? "" : "List item"}
                      html={block.content}
                    />
                  </div>
                );
              case 'checklist-item':
                return (
                  <div className="flex items-start gap-3 my-1.5 w-full">
                    <input
                      type="checkbox"
                      checked={block.checked || false}
                      disabled={isReadMode}
                      onChange={e => handleBlockChange(block.id, { checked: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-350 text-indigo-600 focus:ring-indigo-500 mt-1.5 select-none"
                    />
                    <ContentEditable
                      id={`editable-${block.id}`}
                      disabled={isReadMode}
                      onKeyDown={e => handleKeyDown(e, block)}
                      onInput={e => handleInputText(e, block.id)}
                      className={`w-full text-base font-sans outline-none ${block.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}
                      placeholder={isReadMode ? "" : "To-do point"}
                      html={block.content}
                    />
                  </div>
                );
              case 'quote':
                return (
                  <div className="pl-4 border-l-4 border-indigo-500 italic my-3.5 text-gray-650 bg-slate-50 py-2.5 rounded-r-lg w-full">
                    <ContentEditable
                      id={`editable-${block.id}`}
                      disabled={isReadMode}
                      onKeyDown={e => handleKeyDown(e, block)}
                      onInput={e => handleInputText(e, block.id)}
                      className="w-full text-base font-sans outline-none leading-relaxed"
                      placeholder={isReadMode ? "" : "Insert quote representation"}
                      html={block.content}
                    />
                  </div>
                );
              case 'callout':
                return (
                  <div className="flex items-start gap-3 p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 my-4 w-full">
                    <span className="text-xl select-none leading-none">💡</span>
                    <ContentEditable
                      id={`editable-${block.id}`}
                      disabled={isReadMode}
                      onKeyDown={e => handleKeyDown(e, block)}
                      onInput={e => handleInputText(e, block.id)}
                      className="w-full text-base font-sans text-indigo-950 outline-none"
                      placeholder={isReadMode ? "" : "Callout insights..."}
                      html={block.content}
                    />
                  </div>
                );
              case 'divider':
                return (
                  <div className="my-5 border-t border-gray-200 select-none" />
                );
              case 'table':
                const colMaxLens = block.tableData ? block.tableData[0]?.map((_, cIdx) => {
                  return Math.max(...(block.tableData || []).map(row => (row[cIdx] || '').length), 8);
                }) || [] : [];

                return (
                  <div className="my-5 overflow-x-auto border border-gray-150 rounded-xl bg-white p-2.5 shadow-xs select-text" id={`table-block-${block.id}`}>
                    <table className="table-auto border-separate border-spacing-0 text-xs text-left text-gray-700 select-text" style={{ width: 'max-content', minWidth: '100%' }}>
                      <colgroup>
                        {colMaxLens.map((len, cIdx) => (
                          <col key={cIdx} style={{ width: `${Math.max(120, len * 7.5 + 32)}px` }} />
                        ))}
                      </colgroup>
                      <tbody>
                        {block.tableData?.map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-50/70 border-b border-gray-250 font-semibold' : 'border-b border-gray-100 hover:bg-slate-50/30'}>
                            {row.map((cell, cIdx) => {
                              const isMenuOpen = activeTableCellMenu?.blockId === block.id && activeTableCellMenu?.rIdx === rIdx && activeTableCellMenu?.cIdx === cIdx;
                              return (
                                <td key={cIdx} className="p-2 border border-gray-150 text-xs font-sans relative group/cell">
                                  <input
                                    type="text"
                                    value={cell || ''}
                                    placeholder={isReadMode ? "" : "Empty..."}
                                    readOnly={isReadMode}
                                    onChange={e => handleTableCellChange(block.id, rIdx, cIdx, e.target.value)}
                                    className="w-full bg-transparent border-0 p-0 text-slate-800 outline-none font-sans focus:ring-0 focus:bg-indigo-50/20 rounded px-1 -mx-1"
                                  />
                                  
                                  {/* Sleek cell context trigger button - visible on hover or element focus */}
                                  {!isReadMode && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTableCellMenu(isMenuOpen ? null : { blockId: block.id, rIdx, cIdx });
                                      }}
                                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md bg-white border border-gray-200 shadow-sm text-slate-400 hover:text-slate-800 transition active:scale-90 hover:bg-slate-50 select-none z-10 cursor-pointer lg:opacity-0 lg:group-hover/cell:opacity-100 focus-within:opacity-100 flex items-center justify-center h-5 w-5"
                                      title="Cell Actions Menu"
                                    >
                                      <MoreHorizontal className="h-3 w-3" />
                                    </button>
                                  )}

                                  {/* Floating context menu for cell-level operations */}
                                  {!isReadMode && isMenuOpen && (
                                    <>
                                      <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveTableCellMenu(null)} />
                                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 bg-white border border-gray-250 rounded-lg shadow-xl py-1 w-40 z-50 text-slate-700 font-sans select-none flex flex-col items-stretch text-left">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            addTableRowAbove(block.id, rIdx);
                                            setActiveTableCellMenu(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-[11px] font-semibold hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center gap-1.5"
                                        >
                                          <span>Insert Row Above</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            addTableRowBelow(block.id, rIdx);
                                            setActiveTableCellMenu(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-[11px] font-semibold hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center gap-1.5"
                                        >
                                          <span>Insert Row Below</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            addTableColLeft(block.id, cIdx);
                                            setActiveTableCellMenu(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-[11px] font-semibold hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center gap-1.5"
                                        >
                                          <span>Add Column Left</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            addTableColRight(block.id, cIdx);
                                            setActiveTableCellMenu(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-[11px] font-semibold hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center gap-1.5"
                                        >
                                          <span>Add Column Right</span>
                                        </button>
                                        <div className="border-t border-gray-150 my-1 font-sans" />
                                        <button
                                          type="button"
                                          disabled={block.tableData && block.tableData.length <= 1}
                                          onClick={() => {
                                            removeTableRow(block.id, rIdx);
                                            setActiveTableCellMenu(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent transition flex items-center gap-1.5"
                                        >
                                          <span>Delete Row</span>
                                        </button>
                                        <button
                                          type="button"
                                          disabled={block.tableData && block.tableData[0]?.length <= 1}
                                          onClick={() => {
                                            removeTableCol(block.id, cIdx);
                                            setActiveTableCellMenu(null);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent transition flex items-center gap-1.5"
                                        >
                                          <span>Delete Column</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!isReadMode && (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => addTableRow(block.id)}
                          className="p-1 px-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 text-[10px] font-semibold select-none"
                          title="Add New Row"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Row</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addTableCol(block.id)}
                          className="p-1 px-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 text-[10px] font-semibold select-none"
                          title="Add New Column"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Column</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              case 'markdown-table':
                const isEditingMd = editingMdTableBlockId === block.id;
                const parsedTable = parseMarkdownTable(block.content || '');

                return (
                  <div key={block.id} className="my-5 w-full border border-gray-200 bg-white rounded-xl shadow-xs overflow-hidden select-text">
                    {/* Header Controls Bar */}
                    <div className="bg-slate-50 border-b border-gray-150 px-3.5 py-2 flex items-center justify-between select-none font-sans">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Grid className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {isEditingMd ? 'Markdown Table Editor' : 'Markdown Table Preview'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isReadMode && (
                          <button
                            type="button"
                            onClick={() => setEditingMdTableBlockId(isEditingMd ? null : block.id)}
                            className={`p-1 px-2.5 text-[10px] font-bold rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1 border ${
                              isEditingMd
                                ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                          >
                            {isEditingMd ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Done / Preview</span>
                              </>
                            ) : (
                              <>
                                <Edit className="h-3 w-3" />
                                <span>Edit Raw Markdown</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 bg-white relative">
                      {isEditingMd && !isReadMode ? (
                        <div className="space-y-2.5">
                          <textarea
                            value={block.content}
                            onChange={(e) => handleBlockChange(block.id, { content: e.target.value })}
                            rows={6}
                            placeholder="| Column 1 | Column 2 |\n|---|---|\n| Cell A | Cell B |"
                            className="w-full font-mono text-xs p-3.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 shadow-inner resize-y leading-relaxed"
                          />
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-400 font-mono gap-1.5">
                            <span>Separate headers with pipe '|' and add a delimiter row under headers (e.g. '|---|').</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleBlockChange(block.id, {
                                  content: `| Item | Qty | Price |\n| :--- | :---: | ---: |\n| Notebook | 2 | $4.99 |\n| Pen | 5 | $1.20 |`
                                });
                              }}
                              className="text-indigo-600 hover:text-indigo-805 hover:underline font-bold transition cursor-pointer"
                            >
                              Reset to Template Table
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {parsedTable ? (
                            <div className="overflow-x-auto w-full">
                              <table className="table-auto w-full border-collapse border border-slate-200 rounded-lg text-xs font-sans text-left text-slate-700">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold">
                                    {parsedTable.headers.map((hdr, hIdx) => (
                                      <th
                                        key={hIdx}
                                        className="p-2.5 border-r border-slate-200 text-slate-800 text-[11px] font-bold uppercase tracking-wider bg-slate-50/80"
                                        style={{ textAlign: parsedTable.alignments[hIdx] || 'left' }}
                                      >
                                        {hdr}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {parsedTable.rows.map((row, rIdx) => (
                                    <tr
                                      key={rIdx}
                                      className={`border-b border-slate-150 transition-colors hover:bg-slate-50/50 ${
                                        rIdx % 2 === 1 ? 'bg-slate-50/20' : 'bg-white'
                                      }`}
                                    >
                                      {row.map((cell, cIdx) => (
                                        <td
                                          key={cIdx}
                                          className="p-2.5 border-r border-slate-150 text-slate-705 leading-relaxed break-words"
                                          style={{ textAlign: parsedTable.alignments[cIdx] || 'left' }}
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-6 bg-rose-50/50 border border-dashed border-rose-200 rounded-xl gap-2 font-sans text-center">
                              <span className="p-1 rounded-full bg-rose-100 text-rose-600">
                                <AlertCircle className="h-4 w-4" />
                              </span>
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-rose-800">Invalid Markdown Table formatting</p>
                                <p className="text-[10px] text-rose-550 leading-relaxed font-mono max-w-md">
                                  Markdown tables require at least a header row, a delimiter row (e.g. <code className="bg-rose-100/60 px-1 py-0.5 rounded">|---|---|</code>), and aligned columns. Click "Edit Raw Markdown" to correct.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              case 'highlight-box':
                const isImportant = block.highlightType === 'important';
                const isVeryImportant = block.highlightType === 'very-important';
                const isExamPoint = block.highlightType === 'exam-point';

                let accentClass = 'bg-blue-50/70 border-blue-200 text-blue-900';
                let iconSymbol = '⭐';
                let labelText = 'Important';

                if (isVeryImportant) {
                  accentClass = 'bg-rose-50/70 border-rose-200 text-rose-900';
                  iconSymbol = '🔴';
                  labelText = 'Very Important';
                } else if (isExamPoint) {
                  accentClass = 'bg-amber-50/70 border-amber-200 text-amber-900';
                  iconSymbol = '🔥';
                  labelText = 'Exam Point';
                }

                return (
                  <div className={`p-4 rounded-xl border ${accentClass} my-4.5 w-full`}>
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide select-none mb-2">
                      <span>{iconSymbol}</span>
                      <span>{labelText}</span>
                      {!isReadMode && (
                        <div className="ml-auto flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleBlockChange(block.id, { highlightType: 'important' })}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${isImportant ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-100'}`}
                          >
                            Important
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBlockChange(block.id, { highlightType: 'very-important' })}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${isVeryImportant ? 'bg-rose-600 text-white' : 'bg-white hover:bg-slate-100'}`}
                          >
                            Very Important
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBlockChange(block.id, { highlightType: 'exam-point' })}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${isExamPoint ? 'bg-amber-600 text-white' : 'bg-white hover:bg-slate-100'}`}
                          >
                            Exam Point
                          </button>
                        </div>
                      )}
                    </div>
                    <ContentEditable
                      id={`editable-${block.id}`}
                      disabled={isReadMode}
                      onKeyDown={e => handleKeyDown(e, block)}
                      onInput={e => handleInputText(e, block.id)}
                      className="w-full text-base font-sans outline-none font-medium leading-relaxed"
                      placeholder={isReadMode ? "" : "Write core study point..."}
                      html={block.content}
                    />
                  </div>
                );
              case 'code':
                return (
                  <div className="bg-slate-900 my-4 rounded-xl overflow-hidden shadow-md select-text max-w-full">
                    {/* Header bar */}
                    <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none">
                      <select
                        disabled={isReadMode}
                        value={block.codeLanguage || 'javascript'}
                        onChange={e => handleBlockChange(block.id, { codeLanguage: e.target.value })}
                        className="bg-slate-800 text-slate-300 border-0 rounded px-2 py-0.5 outline-none text-[11px] disabled:opacity-75"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="python">Python</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="sql">SQL</option>
                        <option value="hindi-trans">Hindi Translation</option>
                      </select>
                      <span className="text-slate-500 uppercase tracking-widest text-[9px] font-bold">Code Workspace</span>
                    </div>
                    <textarea
                      value={block.content}
                      readOnly={isReadMode}
                      onChange={e => handleBlockChange(block.id, { content: e.target.value })}
                      placeholder={isReadMode ? "" : "// Insert or write high-performance snippets..."}
                      className="w-full bg-slate-950 p-4 font-mono text-cyan-400 text-xs outline-none border-0 min-h-[100px] resize-y scrollbar-thin scrollbar-thumb-indigo-500/10 placeholder-slate-600"
                    />
                  </div>
                );
              case 'formula':
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-4 flex flex-col items-center justify-center gap-3 w-full relative">
                    <div className="flex flex-col items-center justify-center py-4 px-8 text-center select-all">
                      <div className="font-serif italic text-2xl tracking-wider text-indigo-950 font-bold max-w-full overflow-hidden">
                        {block.formulaTex || 'E = mc²'}
                      </div>
                      <span className="text-[10px] font-mono text-indigo-500 mt-2 tracking-widest uppercase font-semibold">Scientific Preserved Formula</span>
                    </div>
                    {/* Tex source raw code inputs */}
                    {!isReadMode && (
                      <div className="w-full flex items-center gap-2 border-t border-slate-100 pt-3 select-none">
                        <Calculator className="h-3.5 w-3.5 text-indigo-400" />
                        <input
                          type="text"
                          value={block.formulaTex || ''}
                          onChange={e => handleBlockChange(block.id, { formulaTex: e.target.value, content: e.target.value })}
                          placeholder="Edit Formula Tex representation e.g. E = mc²"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-serif font-semibold"
                        />
                      </div>
                    )}
                  </div>
                );
              case 'image':
                return (
                  <div className="my-5 border border-gray-150 rounded-xl bg-slate-50 p-3 shadow-xs space-y-3 relative group/image">
                    <div className="flex items-center gap-2 justify-between border-b border-gray-150/60 pb-2 text-xs select-none">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-500">
                        <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Embedded Image Frame</span>
                      </span>
                      {!isReadMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = prompt('Enter Image URL:', block.imageSrc || '');
                            if (url !== null) {
                              handleBlockChange(block.id, { imageSrc: url });
                            }
                          }}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md cursor-pointer"
                        >
                          Change Source
                        </button>
                      )}
                    </div>
                    {block.imageSrc ? (
                      <div className="relative group/zoom flex flex-col items-center">
                        <img
                          src={block.imageSrc}
                          alt={block.imageCaption || 'Embedded document graphic'}
                          referrerPolicy="no-referrer"
                          className="max-h-72 rounded-lg object-contain shadow-xs cursor-zoom-in hover:brightness-95 transition"
                          onClick={() => {
                            const imgIdx = note.blocks.filter(b => b.type === 'image' && b.imageSrc).findIndex(b => b.id === block.id);
                            if (imgIdx !== -1) {
                              setGalleryIndex(imgIdx);
                            }
                          }}
                        />
                        <input
                          type="text"
                          value={block.imageCaption || ''}
                          readOnly={isReadMode}
                          onChange={e => handleBlockChange(block.id, { imageCaption: e.target.value })}
                          placeholder={isReadMode ? "" : "Write photo caption..."}
                          className="w-full text-center bg-transparent border-0 mt-2 text-xs text-slate-450 italic outline-none py-1 focus:ring-1 focus:ring-slate-200 rounded"
                        />
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center bg-white space-y-2 select-none">
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                        <span className="text-xs text-gray-400">No Image Source Configured</span>
                        {!isReadMode && (
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('Enter Image URL:');
                              if (url) {
                                handleBlockChange(block.id, { imageSrc: url, imageCaption: 'Image visual representation' });
                              }
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                          >
                            Provide Image URL
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              case 'paragraph':
              default: {
                const isSvgDiagram = block.content.trim().startsWith('<svg');
                if (isSvgDiagram) {
                  return (
                    <div className="my-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center relative group/diagram overflow-x-auto w-full select-none">
                      <div className="absolute top-2.5 right-3 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-wider select-none border border-indigo-100/50 dark:border-indigo-900/30">
                        ✨ AI Academic Diagram
                      </div>
                      <div 
                        dangerouslySetInnerHTML={{ __html: block.content }} 
                        className="w-full flex items-center justify-center py-2 min-h-[160px]"
                      />
                      {!isReadMode && (
                        <div className="mt-2.5 opacity-0 group-hover/diagram:opacity-100 transition duration-150 flex items-center gap-2">
                          <button
                            onClick={() => deleteBlock(block.id)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                          >
                            Remove Vector
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <ContentEditable
                    id={`editable-${block.id}`}
                    disabled={isReadMode}
                    onKeyDown={e => handleKeyDown(e, block)}
                    onInput={e => handleInputText(e, block.id)}
                    className="w-full text-base font-sans text-gray-700 outline-none leading-relaxed min-h-[24px]"
                    placeholder={isReadMode ? "" : "Type '/' for headings, templates, tables, formulas..."}
                    html={block.content}
                  />
                );
              }
            }
          })()}
        </div>

        {/* Floating Slash command menu inside paragraph block */}
        {!isReadMode && slashCommandIndex && slashCommandIndex.blockId === block.id && (
          <div className="absolute left-16 top-10 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-40 max-h-72 overflow-y-auto select-none py-1">
            <div className="px-3.5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-gray-150">
              Notion Block commands
            </div>
            {slashCommandMenuOptions
              .filter(o => o.label.toLowerCase().includes(slashCommandIndex.query.toLowerCase()))
              .map(option => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => applySlashCommand(block.id, option.type)}
                  className="w-full flex items-start gap-3 px-3.5 py-2 hover:bg-slate-50 text-left transition"
                >
                  <div className="p-1 rounded bg-slate-100 text-indigo-600 mt-0.5">
                    {option.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 leading-snug">{option.label}</div>
                    <div className="text-[10px] text-slate-400">{option.desc}</div>
                  </div>
                </button>
              ))}
            {slashCommandMenuOptions.filter(o => o.label.toLowerCase().includes(slashCommandIndex.query.toLowerCase())).length === 0 && (
              <div className="p-3 text-xs text-slate-400 italic text-center">No blocks matches found...</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const getWordAndCharCount = () => {
    let text = note.title || '';
    note.blocks.forEach(block => {
      text += ' ' + (block.content || '');
      if (block.tableData) {
        block.tableData.forEach(row => {
          row.forEach(cell => {
            text += ' ' + cell;
          });
        });
      }
    });
    const charCount = text.length;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
    return { wordCount, charCount };
  };

  const { wordCount, charCount } = getWordAndCharCount();
  const imageBlocks = note.blocks.filter(b => b.type === 'image' && b.imageSrc);

  return (
    <div className="flex-1 bg-white h-full flex flex-row items-stretch select-text relative overflow-hidden">
      {/* Scrollable Editor Area */}
      <div className="flex-1 overflow-y-auto flex flex-col relative scrollbar-thin">
        {note.isDeleted && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-sm select-none">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold font-sans">
              <span className="p-1 rounded-full bg-amber-100 flex-shrink-0 animate-pulse"><AlertCircle className="h-4 w-4 text-amber-600" /></span>
              <span>This note is in the Trash. Content is read-only and will be permanently deleted after 30 days.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onRestoreNote(note.id)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Restore Note
              </button>
              <button
                onClick={() => {
                  if (confirm('Permanently delete this note? This action cannot be undone.')) {
                    onDeletePermanently(note.id);
                  }
                }}
                className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        )}

        <div className={`flex-1 flex flex-col ${note.isDeleted ? 'pointer-events-none select-none opacity-80' : ''}`}>
          {/* Main Workspace Frame container */}
          <div className="max-w-3xl w-full mx-auto px-4 sm:px-8 md:px-16 pt-8 pb-32 flex-1 flex flex-col select-text relative">
        {/* Floating action buttons at the top of note page */}
        {!note.isDeleted && (
          <div className="flex sticky top-0 bg-white/95 py-2.5 z-15 w-full justify-between items-center select-none border-b border-gray-100 flex-wrap gap-2.5">
            {/* Sync status indicator */}
            <div className="flex items-center text-[11px] text-slate-400 font-medium select-none h-6 relative min-w-[120px]">
              <AnimatePresence mode="wait">
                {syncState === 'saving' ? (
                  <motion.div
                    key="saving"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5 text-amber-600 font-sans absolute inset-0"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Syncing...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="saved"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-1.5 text-emerald-600 font-sans absolute inset-0"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <Cloud className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Saved</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Premium Textless Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Templates Selection Button */}
              <div className="relative">
                <button
                  onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                  className={`p-2 rounded-lg border transition active:scale-95 cursor-pointer ${
                    showTemplatesDropdown
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600'
                  }`}
                  title="Apply Note Structure Template"
                >
                  <ClipboardList className="h-4 w-4" />
                </button>
                {showTemplatesDropdown && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowTemplatesDropdown(false)} />
                    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 w-52 z-50 text-slate-800 font-sans text-left">
                      <div className="px-3 py-1 border-b border-gray-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Document Templates
                      </div>
                      <button
                        type="button"
                        onClick={() => applyTemplate('weekly')}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-705 flex items-center gap-2 transition"
                      >
                        <span className="text-sm select-none">📅</span>
                        <span>Weekly Planner</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplate('project')}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-705 flex items-center gap-2 transition"
                      >
                        <span className="text-sm select-none">🚀</span>
                        <span>Project Outline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplate('study')}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-705 flex items-center gap-2 transition"
                      >
                        <span className="text-sm select-none">📖</span>
                        <span>Study Summary</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Read Mode Toggle Button */}
              <button
                onClick={() => setIsReadMode(!isReadMode)}
                className={`p-2 rounded-lg border transition active:scale-95 cursor-pointer flex items-center justify-center ${
                  isReadMode
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600'
                }`}
                style={{ width: '30px', height: '30px' }}
                title={isReadMode ? 'Enter Edit Mode' : 'Enter Read Mode'}
              >
                {isReadMode ? <Edit className="h-4 w-4 text-indigo-600" /> : <BookOpen className="h-4 w-4" />}
              </button>

              <button
                onClick={handleTogglePin}
                className={`p-2 rounded-lg border transition active:scale-95 cursor-pointer ${
                  note.pinned
                    ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                    : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }`}
                title={note.pinned ? 'Unpin note' : 'Pin note'}
              >
                <Pin className={`h-4 w-4 ${note.pinned ? 'fill-amber-400 text-amber-500' : ''}`} />
              </button>
              <button
                onClick={handleExportMarkdown}
                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600 transition active:scale-95 cursor-pointer"
                title="Export as Markdown (.md)"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={onOpenMindMap}
                className="p-2 rounded-lg border border-indigo-100 bg-indigo-50/30 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition active:scale-95 cursor-pointer"
                title="Study as Mind Map"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                className={`p-2 rounded-lg border transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                  isAiPanelOpen
                    ? 'bg-purple-50 border-purple-200 text-purple-700 font-semibold shadow-xs'
                    : 'bg-indigo-50/50 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
                title="AI Companion & Diagram Explainer"
              >
                <Sparkles className={`h-4 w-4 ${isAiPanelOpen ? 'text-purple-600 fill-purple-200 animate-pulse' : 'text-indigo-600'}`} />
                <span className="text-xs font-sans font-semibold hidden md:inline">AI Assistant</span>
              </button>
              <button
                onClick={onOpenPdfExporter}
                className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-md transition active:scale-95 cursor-pointer"
                title="Export premium PDF"
              >
                <Layout className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Emoji Selector sitting cleanly above the note title */}
        <div className="mt-4 relative z-10 select-none pb-4">
          <button
            onClick={() => !isReadMode && setShowEmojiPicker(!showEmojiPicker)}
            className={`bg-white border-2 border-white rounded-2xl shadow-xl flex items-center justify-center transition leading-none ${isReadMode ? 'cursor-default' : 'hover:scale-105 active:scale-95'}`}
            style={{ width: '30px', height: '30px', fontSize: '18px' }}
            title={isReadMode ? "" : "Choose note icon"}
          >
            {note.coverEmoji || '📄'}
          </button>
          {showEmojiPicker && (
            <div className="absolute top-22 left-0 bg-white border border-gray-200 p-3 rounded-2xl shadow-2xl z-40 w-72 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-sm font-semibold text-slate-500 uppercase tracking-widest text-[10px]">
                <span>Choose Note Emoji</span>
                <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-red-500">Close</button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {POPULAR_EMOJIS.map(emo => (
                  <button
                    key={emo}
                    onClick={() => updateEmoji(emo)}
                    className="text-2xl hover:bg-slate-50 p-1 rounded-lg transition active:scale-90"
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Inline Styling Tool Helper Box */}
        {!note.isDeleted && !isReadMode && (
          <div className="p-1 px-2.5 bg-slate-900 text-white rounded-xl shadow-lg flex items-center gap-2.5 my-3.5 select-none w-fit self-start border border-slate-800 text-xs">
            <button onClick={() => formatText('bold')} className="p-1 hover:bg-slate-800 rounded font-bold" title="Ctrl+B"><Bold className="h-3.5 w-3.5" /></button>
            <button onClick={() => formatText('italic')} className="p-1 hover:bg-slate-800 rounded italic" title="Ctrl+I"><Italic className="h-3.5 w-3.5" /></button>
            <button onClick={() => formatText('underline')} className="p-1 hover:bg-slate-800 rounded" title="Ctrl+U"><Underline className="h-3.5 w-3.5" /></button>
            <button onClick={() => formatText('strikeThrough')} className="p-1 hover:bg-slate-800 rounded line-through"><Strikethrough className="h-3.5 w-3.5" /></button>
            <div className="h-4 w-px bg-slate-700" />
            <button onClick={() => formatTextColorAndHighlight('fontName', 'Playfair Display')} className="p-1 px-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded font-serif font-extrabold text-xs" title="Change to Serif typography style">Ag</button>
            <button onClick={() => formatTextColorAndHighlight('fontName', 'Inter')} className="p-1 px-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded font-sans font-semibold text-xs" title="Change to Sans-serif typography style">Ag</button>
            <button onClick={() => formatTextColorAndHighlight('backColor', '#FEF08A')} className="p-1 hover:bg-slate-800 rounded flex items-center gap-1 text-yellow-300" title="Highlighter marker"><Highlighter className="h-3.5 w-3.5" /></button>
            <button onClick={() => formatTextColorAndHighlight('foreColor', '#4F46E5')} className="p-1 hover:bg-slate-800 rounded text-indigo-400" title="Color text"><Palette className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {/* Clean Note Title input */}
        <input
          type="text"
          value={note.title}
          readOnly={isReadMode}
          onChange={e => updateNoteTitle(e.target.value)}
          placeholder="Untitled Note"
          className={`w-full text-4xl font-sans font-bold tracking-tight text-gray-900 border-0 outline-none pb-4 mb-3 border-b border-gray-100 placeholder-gray-300 ${isReadMode ? 'cursor-default' : 'select-all'}`}
        />

        {/* Note Tags Management Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6 select-none border-b border-gray-50 pb-3" id="anotes-tags-bar">
          <div className="flex items-center gap-1 text-slate-400 mr-1 text-xs font-semibold">
            <Tag className="h-3.5 w-3.5" />
            <span>Tags:</span>
          </div>

          {/* Render List of Active Tags */}
          {(note.tags || []).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition"
            >
              #{tag}
              {!note.isDeleted && !isReadMode && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="p-0.5 rounded-full hover:bg-slate-300 text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Remove tag"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          ))}

          {/* Inline tag adder input */}
          {!note.isDeleted && !isReadMode && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTag();
              }}
              className="inline-flex items-center"
            >
              <input
                type="text"
                placeholder="+ tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                className="px-2.5 py-0.5 border border-dashed border-gray-300 rounded-full text-xs text-slate-500 focus:text-indigo-600 focus:border-indigo-400 focus:bg-indigo-50/20 outline-none transition w-16 focus:w-24 font-medium"
              />
            </form>
          )}
        </div>

        {/* Core Block Stream renderer */}
        <div className="space-y-1.5 flex-1 select-text">
          {note.blocks.map((block, idx) => renderBlockItem(block, idx))}
        </div>

        {/* Add Block footer handle */}
        {!note.isDeleted && !isReadMode && (
          <div className="mt-8 border-t border-gray-100 pt-5 flex justify-center select-none">
            <button
              onClick={() => addBlock('paragraph')}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full border border-gray-200 transition active:scale-95 shadow-xs"
              title="Add New Block"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      
      {/* Dynamic Word and Character Count Status Footer */}
      <div className="bg-slate-50 border-t border-slate-100 px-6 py-2 shrink-0 flex items-center justify-between text-[11px] text-slate-500 sticky bottom-0 z-20 bg-white/95 backdrop-blur-xs select-none shadow-[0_-1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4">
          <span>
            Words: <strong className="text-slate-800 font-semibold">{wordCount}</strong>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span>
            Characters: <strong className="text-slate-800 font-semibold">{charCount}</strong>
          </span>
        </div>
        <div className="font-mono text-[9px] text-slate-400 tracking-wider">
          {note.isDeleted ? 'READ-ONLY TRASH' : 'LOCAL WORKSPACE SYNCED'}
        </div>
      </div>

      </div>

      {/* Visual backdrop overlay for mobile view when AI side panel is active */}
      {isAiPanelOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden transition-opacity duration-350 pointer-events-auto"
          onClick={() => setIsAiPanelOpen(false)}
        />
      )}

      {/* AI Note Companion Side Panel overlay / drawer */}
      {isAiPanelOpen && (
        <div className="fixed inset-y-0 right-0 md:relative md:inset-auto z-40 w-full sm:w-96 border-l border-indigo-150 p-5 shrink-0 h-full flex flex-col bg-white dark:bg-slate-950 md:bg-indigo-50/30 md:dark:bg-slate-900 shadow-2xl md:shadow-none select-none animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-950/40 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 fill-indigo-100 dark:fill-indigo-950/30 animate-pulse" />
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm font-sans tracking-tight">AI Note Companion</span>
            </div>
            <button
              onClick={() => setIsAiPanelOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close AI Companion"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin select-text">
            {/* Context/Select block panel */}
            <div className="p-3 bg-white dark:bg-slate-950 border border-indigo-50 dark:border-indigo-950/30 rounded-xl space-y-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Target context block</span>
              {aiSelectedBlockId ? (
                (() => {
                  const focusedBlock = note.blocks.find(b => b.id === aiSelectedBlockId);
                  return (
                    <div className="flex flex-col gap-1.5 select-text">
                      <div className="flex items-center justify-between select-none">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 uppercase text-[9px]">
                          Block: {focusedBlock?.type || 'Paragraph'}
                        </span>
                        <button
                          onClick={() => setAiSelectedBlockId(null)}
                          className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium font-sans cursor-pointer"
                        >
                          Send whole note
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        {focusedBlock?.content ? focusedBlock.content.replace(/<[^>]*>/g, '') : '(Empty block content)'}
                      </p>
                    </div>
                  );
                })()
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between select-none">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 uppercase text-[9px]">
                      Entire Document
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 bg-purple-50/20 dark:bg-purple-950/10 p-2.5 rounded-lg border border-purple-50/50 dark:border-purple-950/20 leading-relaxed font-sans">
                    Gemini AI will analyze and synthesize the entire note scope for generating takeaways, definitions, and study concepts.
                  </p>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1 select-none">Or select specific note block:</label>
                  <select
                    value={aiSelectedBlockId || ''}
                    onChange={(e) => setAiSelectedBlockId(e.target.value || null)}
                    className="w-full text-xs p-2 border border-gray-250 dark:border-slate-800 rounded-lg outline-none cursor-pointer focus:border-indigo-400 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 select-text"
                  >
                    <option value="">-- Apply to whole note --</option>
                    {note.blocks.map((b, bIdx) => {
                      const plainText = b.content.replace(/<[^>]*>/g, '').trim();
                      if (!plainText) return null;
                      return (
                        <option key={b.id} value={b.id}>
                          #{bIdx + 1} ({b.type}): {plainText.substring(0, 30)}...
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* AI Action Picker */}
            <div className="space-y-2 select-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Select AI brain action</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'summarize', label: 'Summarize Keypoints', icon: FileText, desc: 'Generates modern bulleted executive summaries and definitions.' },
                  { id: 'enhance', label: 'Elite Polish', icon: PenTool, desc: 'Elevates grammar, style, vocabulary flow and clarity.' },
                  { id: 'simplify', label: 'Explain / Analogy', icon: HelpCircle, desc: 'Explains dense concepts with illustrative real life analogies.' },
                  { id: 'translate_academic', label: 'Hindi / Sanskrit', icon: Languages, desc: 'Translates to academic Hindi and classical Sanskrit root guides.' },
                  { id: 'expand', label: 'Deep Expand', icon: Plus, desc: 'Synthesizes context and elaborates next coherent paragraphs.' },
                  { id: 'concept-diagram', label: 'Schema Diagram', icon: Network, desc: 'Generates gorgeous interactive vector SVG study diagrams.' },
                ].map((act) => {
                  const Icon = act.icon;
                  const isSelt = aiSelectedAction === act.id;
                  return (
                    <button
                      key={act.id}
                      onClick={() => setAiSelectedAction(act.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer select-none ${
                        isSelt
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 hover:bg-slate-50'
                      }`}
                      title={act.desc}
                    >
                      <Icon className={`h-4.5 w-4.5 mb-1.5 ${isSelt ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                      <div className="text-[11px] leading-tight font-semibold font-sans">{act.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={() => handleAiAction()}
              disabled={aiStatus === 'loading'}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none shadow-xs"
            >
              {aiStatus === 'loading' ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 fill-white/20" />
                  <span>Execute AI Assistant</span>
                </>
              )}
            </button>

            {/* AI Console Display output */}
            {aiStatus !== 'idle' && (
              <div className="p-3.5 bg-slate-950 text-slate-100 rounded-xl space-y-3.5 border border-slate-850 shadow-inner select-text">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block border-b border-slate-900 pb-1.5 font-mono select-none">
                  Gemini Study System Output
                </span>

                {aiStatus === 'loading' && (
                  <div className="py-10 flex flex-col items-center justify-center gap-2 select-none">
                    <span className="p-2.5 rounded-full bg-slate-900 border border-slate-800 animate-pulse">
                      <Sparkles className="h-5 w-5 text-indigo-400 animate-bounce" />
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 animate-pulse">Analyzing note structure tokens...</span>
                  </div>
                )}

                {aiStatus === 'error' && (
                  <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/40 text-red-300 text-xs text-left leading-relaxed">
                    {aiErrorMsg}
                  </div>
                )}

                {aiStatus === 'success' && aiOutput && (
                  <div className="space-y-3 select-text">
                    <div className="text-xs font-sans text-slate-200 leading-relaxed max-h-72 overflow-y-auto pr-1 scrollbar-thin select-text">
                      {aiSelectedAction === 'concept-diagram' ? (
                        <div className="bg-white rounded-xl p-3 flex flex-col items-center justify-center min-h-[160px] overflow-hidden select-none border border-slate-100">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Interactive vector schematic pre-visual</span>
                          <div dangerouslySetInnerHTML={{ __html: aiOutput }} className="w-full flex items-center justify-center scale-95" />
                        </div>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: aiOutput }} className="prose prose-xs prose-invert" />
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 border-t border-slate-900 pt-3 select-none">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Integrate output into note:</span>
                      <div className="grid grid-cols-2 gap-1.5 select-none">
                        {aiSelectedBlockId && aiSelectedAction !== 'concept-diagram' && (
                          <button
                            onClick={() => applyAiOutput('replace')}
                            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition font-sans cursor-pointer flex items-center justify-center shadow-xs"
                          >
                            Replace Content
                          </button>
                        )}
                        <button
                          onClick={() => applyAiOutput('insert_below')}
                          className="p-2 bg-slate-800 hover:bg-slate-705 text-white rounded-lg text-[10px] font-bold transition font-sans cursor-pointer flex items-center justify-center shadow-xs"
                        >
                          Insert Under Block
                        </button>
                        <button
                          onClick={() => applyAiOutput('append_end')}
                          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition font-sans col-span-2 cursor-pointer flex items-center justify-center shadow-xs"
                        >
                          Append to End of Note
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TableOfContents Right Panel Sidebar */}
      <div className="w-72 border-l border-gray-100 p-6 shrink-0 h-full hidden xl:flex flex-col bg-slate-50/25 sticky top-0 overflow-y-auto scrollbar-none">
        <TableOfContents blocks={note.blocks} />
      </div>

      {/* Floating Outline Popover button for smaller screens */}
      {!note.isDeleted && (
        <div className="fixed bottom-14 right-6 z-35 xl:hidden select-none">
          <button
            onClick={() => setShowFloatingTOC(!showFloatingTOC)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5 font-sans font-semibold text-xs border border-indigo-400/20"
            title="Document Table of Contents"
          >
            <ClipboardList className="h-4 w-4" />
            <span>Outline</span>
          </button>
          {showFloatingTOC && (
            <>
              <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-xs" onClick={() => setShowFloatingTOC(false)} />
              <div className="absolute right-0 bottom-11 bg-white border border-slate-200 p-5 rounded-2xl shadow-2xl w-76 z-50 text-slate-800">
                <div className="flex items-center justify-between pb-2.5 border-b border-gray-150 mb-3 select-none">
                  <span className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Note Outline List</span>
                  <button onClick={() => setShowFloatingTOC(false)} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition">Close</button>
                </div>
                <TableOfContents blocks={note.blocks} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Dynamic Interactive Image Zoom Lightbox Overlay */}
      <AnimatePresence>
        {galleryIndex !== null && imageBlocks[galleryIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 z-55 flex flex-col items-center justify-center select-none"
            onClick={() => setGalleryIndex(null)}
          >
            {/* Gallery Header Controls */}
            <div className="absolute top-0 inset-x-0 p-5 flex items-center justify-between text-white z-50 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">ANotes Study Image Gallery</span>
                <span className="text-sm font-bold text-white max-w-md truncate">
                  {imageBlocks[galleryIndex].imageCaption || 'Embedded file visual representation'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-slate-350 bg-white/10 px-2.5 py-1 rounded-full border border-white/5 font-semibold">
                  {galleryIndex + 1} / {imageBlocks.length}
                </span>
                <button
                  onClick={() => setGalleryIndex(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-white transition active:scale-90 cursor-pointer animate-pulse"
                  title="Close Gallery Overlay"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Main Stage Container */}
            <div 
              className="relative max-w-4xl max-h-[75vh] w-full px-6 flex items-center justify-center z-45"
              onClick={(e) => e.stopPropagation()}
            >
              <ZoomableImage src={imageBlocks[galleryIndex].imageSrc!} />
            </div>

            {/* Gallery Interactive Slide Controls */}
            {imageBlocks.length > 1 && (
              <div className="absolute bottom-8 inset-x-0 flex items-center justify-center gap-4 z-50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryIndex(prev => (prev !== null && prev > 0 ? prev - 1 : imageBlocks.length - 1));
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition active:scale-95 cursor-pointer backdrop-blur-md border border-white/5 shadow-lg"
                >
                  ← Prev Caption
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryIndex(prev => (prev !== null && prev < imageBlocks.length - 1 ? prev + 1 : 0));
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition active:scale-95 cursor-pointer backdrop-blur-md border border-white/5 shadow-lg"
                >
                  Next Caption →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}

// Subcomponent: Outline View of Note (H1-H3 Parsing)
interface TableOfContentsProps {
  blocks: Block[];
}

function TableOfContents({ blocks }: TableOfContentsProps) {
  const headings = blocks.filter(
    b => b.type === 'heading-1' || b.type === 'heading-2' || b.type === 'heading-3'
  );

  const scrollToBlock = (blockId: string) => {
    const el = document.getElementById(`editable-${blockId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Temporary high-contrast text attention flash
      el.classList.add('bg-indigo-50/70', 'ring-2', 'ring-indigo-200/50', 'rounded-lg', 'transition-all', 'duration-500');
      setTimeout(() => {
        el.classList.remove('bg-indigo-50/70', 'ring-2', 'ring-indigo-200/50');
      }, 1500);
    }
  };

  if (headings.length === 0) {
    return (
      <div className="text-slate-400 text-xs text-center py-8 select-none font-sans italic border border-dashed border-slate-200 rounded-2xl bg-slate-50/25 px-4 leading-relaxed">
        No headings inside this study note yet. Create H1-H3 sections using "/" slash commands to build your outline.
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none font-sans">
      <div className="text-[10px] font-bold text-slate-450 uppercase tracking-widest px-2 pb-2 select-none border-b border-gray-100 flex items-center gap-1.5">
        <ClipboardList className="h-3.5 w-3.5 text-indigo-500" />
        <span>Document Outline</span>
      </div>
      <div className="space-y-1.5 max-h-[75vh] overflow-y-auto pr-1 flex flex-col scrollbar-none">
        {headings.map((h) => {
          let indent = '';
          let textStyle = 'text-slate-800 font-semibold text-xs';
          if (h.type === 'heading-2') {
            indent = 'pl-3';
            textStyle = 'text-slate-600 hover:text-slate-950 font-medium text-[11px]';
          } else if (h.type === 'heading-3') {
            indent = 'pl-6';
            textStyle = 'text-slate-500 hover:text-slate-900 font-normal text-[11px]';
          }

          // Strip HTML structures if written inside note blocks
          const cleanText = (h.content || '')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim();

          return (
            <button
              key={h.id}
              onClick={() => scrollToBlock(h.id)}
              className={`w-full text-left py-1.5 px-3 rounded-lg hover:bg-slate-50 transition cursor-pointer flex items-center justify-between group/toc ${indent}`}
            >
              <span className={`truncate mr-2 ${textStyle}`}>
                {cleanText || 'Untitled heading point'}
              </span>
              <ChevronRight className="h-2.5 w-2.5 opacity-0 group-hover/toc:opacity-100 transition text-indigo-500 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Subcomponent: Touch and Drag Zoomable Image stage
interface ZoomableImageProps {
  src: string;
}

function ZoomableImage({ src }: ZoomableImageProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const touchStartDist = useRef<number | null>(null);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isDragging) return;
    if (scale === 1) return; // Allow pan only when enlarged
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDist.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLImageElement>) => {
    if (e.touches.length === 2 && touchStartDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = dist / touchStartDist.current;
      setScale(prev => Math.max(1, Math.min(4, prev * (diff > 1 ? 1.05 : 0.95))));
      touchStartDist.current = dist;
    }
  };

  const handleTouchEnd = () => {
    touchStartDist.current = null;
  };

  return (
    <div className="overflow-hidden flex items-center justify-center w-full h-full relative" style={{ touchAction: 'none' }}>
      <img
        src={src}
        alt="Enlarged study graphic"
        referrerPolicy="no-referrer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        className="max-h-[70vh] max-w-full rounded-2xl select-none object-contain transition-transform duration-100 ease-out shadow-2xl border border-white/5"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          cursor: scale > 1 ? 'grab' : 'zoom-in',
        }}
        draggable={false}
      />
      
      {/* Zoom Range Quick Indicator overlay */}
      <div className="absolute right-4 bottom-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl z-55 flex items-center gap-3 border border-white/10 select-none">
        <button
          onClick={() => setScale(prev => Math.max(1, prev - 0.5))}
          className="text-white hover:text-indigo-400 font-bold text-xs p-1 cursor-pointer transition active:scale-90"
        >
          -
        </button>
        <span className="text-[10px] font-mono font-bold text-slate-300">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(prev => Math.min(4, prev + 0.5))}
          className="text-white hover:text-indigo-400 font-bold text-xs p-1 cursor-pointer transition active:scale-90"
        >
          +
        </button>
        <button
          onClick={resetZoom}
          className="text-[9px] px-1.5 py-0.5 rounded bg-white/15 text-slate-200 hover:text-white hover:bg-white/25 transition font-semibold"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
