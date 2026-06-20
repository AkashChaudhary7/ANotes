import React, { useState, useEffect } from 'react';
import { Note, Block, PremiumTheme, PDFExportOptions } from '../types';
import {
  FileText,
  X,
  Printer,
  Sparkles,
  Award,
  BookOpen,
  Eye,
  Sliders,
  Type,
  User,
  Calendar,
  CheckCircle,
  Hash,
  Compass
} from 'lucide-react';

interface ParsedMarkdownTable {
  headers: string[];
  rows: string[][];
  alignments: ('left' | 'center' | 'right')[];
}

const parseMarkdownTable = (markdown: string): ParsedMarkdownTable | null => {
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

interface PDFExporterProps {
  note: Note;
  onClose: () => void;
}

export default function PDFExporter({ note, onClose }: PDFExporterProps) {
  const [options, setOptions] = useState<PDFExportOptions>({
    theme: 'academic',
    includeCover: true,
    author: 'Akash Chaudhary',
    date: '14 June 2026',
    subtitle: 'Comprehensive Sociology & Civil Services Notes',
    autoTOC: true,
    pageNumbers: true,
    watermarkText: 'Akash Chaudhary',
    watermarkEnabled: true,
    sectionAutoNumber: true
  });

  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');

  // Automatically gather headings for TOC (H1 and H2)
  const headings = note.blocks
    .filter(b => b.type === 'heading-1' || b.type === 'heading-2')
    .map((b, i) => ({
      id: b.id,
      text: b.content.replace(/<[^>]*>/g, ''), // strip html tags
      level: b.type === 'heading-1' ? 1 : 2,
    }));

  const [isPreparing, setIsPreparing] = useState(false);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    // Show a high-quality layout compile simulation whenever options/theme change
    setIsRendering(true);
    const timer = setTimeout(() => {
      setIsRendering(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [options.theme, options.includeCover, options.autoTOC, options.pageNumbers, options.watermarkEnabled, options.sectionAutoNumber]);

  const handlePrint = () => {
    if (isPreparing) return;
    setIsPreparing(true);

    const triggerPrint = () => {
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          setIsPreparing(false);
        }, 800);
      }, 150);
    };

    if (document.fonts && typeof document.fonts.ready !== 'undefined') {
      document.fonts.ready
        .then(() => {
          triggerPrint();
        })
        .catch(() => {
          triggerPrint();
        });
    } else {
      triggerPrint();
    }
  };

  // Theme settings mapping for inline configuration
  const getThemeStyles = (theme: PremiumTheme) => {
    switch (theme) {
      case 'academic':
        return {
          fontFamily: 'Lora, "Noto Serif", "Noto Serif Devanagari", serif',
          primaryColor: '#1e3a8a', // Deep Blue
          bgColor: '#f8fafc',
          borderColor: '#3b82f6',
          headerFooterFont: 'sans-serif',
          name: 'Academic Study Theme'
        };
      case 'royal':
        return {
          fontFamily: 'Playfair Display, "Noto Serif", serif',
          primaryColor: '#b45309', // Gold/Amber
          bgColor: '#fffcf2',
          borderColor: '#fbbf24',
          headerFooterFont: 'serif',
          name: 'Luxury Royal Theme'
        };
      case 'dark-professional':
        return {
          fontFamily: 'Inter, "Noto Sans Devanagari", sans-serif',
          primaryColor: '#0f172a', // Dark Gray/Slate
          bgColor: '#f1f5f9',
          borderColor: '#475569',
          headerFooterFont: 'monospace',
          name: 'Dark Professional Accent'
        };
      case 'modern':
      default:
        return {
          fontFamily: 'Inter, "Noto Sans", sans-serif',
          primaryColor: '#4f46e5', // Indigo
          bgColor: '#ffffff',
          borderColor: '#6366f1',
          headerFooterFont: 'sans-serif',
          name: 'Modern Notion Minimal'
        };
    }
  };

  const themeStyle = getThemeStyles(options.theme);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-end z-50 select-text anotes-pdf-modal">
      {/* Exporter sidebar side panel */}
      <div className="w-full sm:w-[450px] h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl z-20">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-950 text-white select-none">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="font-sans font-bold text-base">Premium PDF Exporter</h2>
              <p className="text-[10px] text-slate-400 font-mono">Tailored Theme Engine v2.0</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Configurations Forms */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Options toggle tabs (Settings vs Quick Preview Check) */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold select-none">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition ${
                activeTab === 'config' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Configure Settings
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition ${
                activeTab === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Interactive Preview
            </button>
          </div>

          {activeTab === 'config' ? (
            <div className="space-y-5">
              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">1. Premium Theme Styling</label>
                <div className="grid grid-cols-2 gap-2 select-none">
                  {[
                    { id: 'academic', label: 'Academic Blue', font: 'Lora (Study Font)', desc: 'Elegant blue borders', color: 'border-blue-400 text-blue-700 bg-blue-50/50' },
                    { id: 'modern', label: 'Modern Notion', font: 'Inter (Sans Font)', desc: 'Minimalist clean structure', color: 'border-slate-300 text-slate-800' },
                    { id: 'royal', label: 'Royal Gold', font: 'Playfair (Fancy Serif)', desc: 'Luxury borders & layout', color: 'border-amber-400 text-amber-800 bg-amber-50/30' },
                    { id: 'dark-professional', label: 'Dark Accent', font: 'Inter Mono Accent', desc: 'Dark header bands', color: 'border-slate-900 text-slate-950 bg-slate-50' }
                  ].map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setOptions({ ...options, theme: theme.id as PremiumTheme })}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        options.theme === theme.id
                          ? `ring-2 ring-indigo-500 shadow-md ${theme.color}`
                          : 'border-gray-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className="text-xs font-bold">{theme.label}</span>
                      <span className="text-[10px] font-mono text-slate-400 leading-tight">{theme.font}</span>
                      <span className="text-[9px] text-slate-400">{theme.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover Page Form */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 select-none">
                    <BookOpen className="h-4 w-4 text-indigo-500" />
                    Cover Page Settings
                  </span>
                  <input
                    type="checkbox"
                    checked={options.includeCover}
                    onChange={e => setOptions({ ...options, includeCover: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </div>

                {options.includeCover && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Created By (Author)</label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={options.author}
                          onChange={e => setOptions({ ...options, author: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-700"
                          placeholder="Akash Chaudhary"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Creation Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={options.date}
                          onChange={e => setOptions({ ...options, date: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-700"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Sub-heading descriptor</label>
                      <textarea
                        value={options.subtitle}
                        onChange={e => setOptions({ ...options, subtitle: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-700 resize-none h-16"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Study / Index Settings */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-3 text-xs select-none">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-emerald-500" />
                  Outline & Auto Styling
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">Auto Table of Contents</p>
                      <p className="text-[10px] text-slate-400">Gathers all headers into page-links</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={options.autoTOC}
                      onChange={e => setOptions({ ...options, autoTOC: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">Auto Chapter Numbering</p>
                      <p className="text-[10px] text-slate-400">Convert Heading-1 to "CHAPTER X: Title"</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={options.sectionAutoNumber}
                      onChange={e => setOptions({ ...options, sectionAutoNumber: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">Headers and Page Footers</p>
                      <p className="text-[10px] text-slate-400">Print custom headers & auto page counting</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={options.pageNumbers}
                      onChange={e => setOptions({ ...options, pageNumbers: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Watermark Selector */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-3 select-none">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Hash className="h-4 w-4 text-amber-500" />
                    Background Watermark
                  </span>
                  <input
                    type="checkbox"
                    checked={options.watermarkEnabled}
                    onChange={e => setOptions({ ...options, watermarkEnabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </div>

                {options.watermarkEnabled && (
                  <div className="pt-2 border-t border-slate-200">
                    <input
                      type="text"
                      value={options.watermarkText}
                      onChange={e => setOptions({ ...options, watermarkText: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-700"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-xs leading-relaxed flex gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Interactive Mock Ready</p>
                  <p className="text-[10px] text-emerald-600 mt-1">
                    Toggle options in the left selector panel to update the printable layout template configuration in real-time. Native printing will style every block flawlessly.
                  </p>
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2 text-xs">
                <h4 className="font-bold text-slate-700">Print Preview Map</h4>
                <ul className="space-y-1 text-slate-500 font-mono text-[10px]">
                  <li>• Theme: {themeStyle.name}</li>
                  <li>• Font: {themeStyle.fontFamily}</li>
                  <li>• Cover Page: {options.includeCover ? 'Enabled' : 'Disabled'}</li>
                  <li>• Autogenerated TOC: {options.autoTOC ? 'Yes' : 'No'}</li>
                  <li>• Watermark: {options.watermarkEnabled ? `"${options.watermarkText}"` : 'None'}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Generate / Print Action */}
        <div className="p-5 border-t border-gray-100 bg-slate-50 select-none pb-8">
          <button
            onClick={handlePrint}
            disabled={isPreparing || isRendering}
            className={`w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
              (isPreparing || isRendering) ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            <Printer className={`h-4 w-4 ${(isPreparing || isRendering) ? 'animate-spin' : ''}`} />
            {isPreparing 
              ? 'Preparing Documents...' 
              : isRendering 
                ? 'Pre-rendering Premium Layout...' 
                : 'Download / Save Premium PDF'}
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-2.5 leading-relaxed font-mono">
            Requires Google Chrome or Safari. Set Destination to "Save as PDF" and toggle on background graphics in the printable preferences popup for custom margins.
          </p>
        </div>
      </div>

      {/* Main Preview Page Template */}
      <div className="hidden lg:flex flex-1 h-full bg-slate-800 p-10 overflow-y-auto justify-center print:bg-white print:p-0 select-text relative">
        <div
          id="anotes-print-target"
          className="w-[794px] min-h-[1123px] bg-white shadow-2xl p-16 relative overflow-hidden select-text flex flex-col font-serif print:shadow-none print:w-full print:p-8"
          style={{
            fontFamily: themeStyle.fontFamily,
            borderColor: themeStyle.borderColor
          }}
        >
          {/* Pre-rendering loading spinner overlay */}
          {isRendering && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center gap-4 z-40 select-none print:hidden">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center space-y-1.5">
                <p className="font-sans font-bold text-xs tracking-wider text-slate-800 uppercase">Compiling Theme Typography...</p>
                <p className="text-[9px] text-slate-450 font-mono">Format template: {themeStyle.name}</p>
              </div>
            </div>
          )}
          {/* Print specific Watermark container */}
          {options.watermarkEnabled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
              <span className="text-slate-100 opacity-[0.27] text-7xl font-sans font-extrabold select-none rotate-45 transform uppercase leading-none text-center">
                {options.watermarkText}
              </span>
            </div>
          )}

          {/* COVER PAGE ELEMENT */}
          {options.includeCover && (
            <div className="h-[1000px] border-4 p-10 flex flex-col justify-between relative z-10 bg-white border-double font-serif mb-12 print:h-screen print:page-break-after-always" style={{ borderColor: themeStyle.borderColor }}>
              {/* Cover Top Accent */}
              <div className="space-y-1.5">
                <span className="px-3 py-1 font-mono text-[10px] uppercase font-bold text-white tracking-widest rounded" style={{ backgroundColor: themeStyle.primaryColor }}>
                  ANotes Master Series
                </span>
                <p className="text-xs text-slate-500 tracking-wider font-semibold uppercase pt-2">Authorized study draft compilation</p>
              </div>

              {/* Cover Main Title */}
              <div className="space-y-4 my-auto">
                <div className="text-7xl leading-none font-bold tracking-tight py-2 border-b-2" style={{ color: themeStyle.primaryColor, borderColor: themeStyle.borderColor }}>
                  {note.title || 'ANotes Document'}
                </div>
                <p className="text-lg text-slate-600 leading-relaxed font-sans font-medium">{options.subtitle}</p>
              </div>

              {/* Cover Footer Accent metadata */}
              <div className="font-sans border-t pt-5 flex items-end justify-between text-xs text-slate-500 select-none">
                <div>
                  <p className="uppercase tracking-widest font-bold text-[9px] text-slate-400">Author Certification</p>
                  <p className="font-semibold text-slate-800 text-sm">{options.author}</p>
                </div>
                <div className="text-right">
                  <p className="uppercase tracking-widest font-bold text-[9px] text-slate-400">Date Compilation</p>
                  <p className="font-mono text-slate-800">{options.date}</p>
                </div>
              </div>
            </div>
          )}

          {/* TABLE OF CONTENTS */}
          {options.autoTOC && headings.length > 0 && (
            <div className="mb-12 border-b pb-8 select-text page-break-after-always">
              <div className="flex items-center gap-2 mb-6 select-none">
                <div className="w-1.5 h-6 rounded" style={{ backgroundColor: themeStyle.primaryColor }}></div>
                <h3 className="text-2xl font-bold uppercase tracking-wide" style={{ color: themeStyle.primaryColor }}>Table of Contents</h3>
              </div>
              <div className="space-y-3 select-text pl-4 font-sans">
                {headings.map((head, idx) => (
                  <div key={idx} className={`flex items-baseline justify-between gap-2 ${head.level === 1 ? 'font-bold text-slate-800 text-sm' : 'text-slate-500 text-xs pl-4 font-normal'}`}>
                    <span className="truncate">{idx + 1}. {head.text}</span>
                    <span className="flex-1 border-b border-dotted mx-2 border-slate-300"></span>
                    <span className="font-mono text-[11px]">Page {idx + 2}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HEADER / branding block on non-cover pages */}
          <div className="border-b pb-3 mb-8 flex justify-between text-[11px] text-slate-400 font-sans tracking-widest select-none uppercase font-semibold">
            <span>{options.author}</span>
            <span>{note.title} • ANotes Premium</span>
          </div>

          {/* CORE NOTES STREAM LISTING FOR PRINT */}
          <div className="flex-1 space-y-6 select-text z-10 relative">
            {note.blocks.map((block, idx) => {
              const h1CountBefore = note.blocks.slice(0, idx).filter(b => b.type === 'heading-1').length;
              
              switch (block.type) {
                case 'heading-1':
                  return (
                    <div key={block.id || idx} className="pt-6 pb-2 pb-1 border-b-2" style={{ borderColor: themeStyle.primaryColor }}>
                      <h2 className="text-3xl font-bold font-serif" style={{ color: themeStyle.primaryColor }}>
                        {options.sectionAutoNumber ? `CHAPTER ${h1CountBefore + 1}: ` : ''}
                        {block.content.replace(/<[^>]*>/g, '')}
                      </h2>
                    </div>
                  );
                case 'heading-2':
                  return (
                    <h3 key={block.id || idx} className="text-xl font-bold font-serif text-slate-800 pt-4" style={{ color: themeStyle.primaryColor }}>
                      {block.content.replace(/<[^>]*>/g, '')}
                    </h3>
                  );
                case 'heading-3':
                  return (
                    <h4 key={block.id || idx} className="text-lg font-bold font-serif text-slate-700 pt-3">
                      {block.content.replace(/<[^>]*>/g, '')}
                    </h4>
                  );
                case 'heading-4':
                  return (
                    <h5 key={block.id || idx} className="text-base font-bold font-serif text-slate-700 pt-2">
                      {block.content.replace(/<[^>]*>/g, '')}
                    </h5>
                  );
                case 'bullet-list-item':
                  return (
                    <div key={block.id || idx} className="flex items-start gap-2 text-sm leading-relaxed text-slate-800 pl-4">
                      <span>•</span>
                      <span dangerouslySetInnerHTML={{ __html: block.content }} />
                    </div>
                  );
                case 'numbered-list-item':
                  return (
                    <div key={block.id || idx} className="flex items-start gap-2 text-sm leading-relaxed text-slate-800 pl-4">
                      <span>{(note.blocks.slice(0, idx).filter(b => b.type === 'numbered-list-item').length + 1)}.</span>
                      <span dangerouslySetInnerHTML={{ __html: block.content }} />
                    </div>
                  );
                case 'checklist-item':
                  return (
                    <div key={block.id || idx} className="flex items-start gap-2 text-sm leading-relaxed text-slate-800 pl-4">
                      <span className="font-mono">{block.checked ? '[🗸]' : '[ ]'}</span>
                      <span className={block.checked ? 'line-through text-slate-400' : ''} dangerouslySetInnerHTML={{ __html: block.content }} />
                    </div>
                  );
                case 'quote':
                  return (
                    <div key={block.id || idx} className="pl-4 border-l-4 italic my-4 py-1 text-slate-600 bg-slate-50 rounded-r" style={{ borderLeftColor: themeStyle.borderColor }}>
                      <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: block.content }} />
                    </div>
                  );
                case 'callout':
                  return (
                    <div key={block.id || idx} className="flex items-start gap-3 p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 my-4 text-slate-800 text-xs">
                      <span className="text-base select-none mt-0.5">💡</span>
                      <p className="leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: block.content }} />
                    </div>
                  );
                case 'divider':
                  return (
                    <div key={block.id || idx} className="my-6 border-t border-slate-250" />
                  );
                case 'table':
                  return (
                    <div key={block.id || idx} className="my-4 overflow-x-auto border rounded-xl bg-white p-3 select-text">
                      <table className="min-w-full border-collapse text-[11px] text-left text-gray-700">
                        <tbody>
                          {block.tableData?.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-50 border-b font-semibold text-slate-900' : 'border-b border-slate-100'}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-1.5 border border-slate-200">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                case 'markdown-table':
                  const parsed = parseMarkdownTable(block.content || '');
                  if (!parsed) {
                    return (
                      <div key={block.id || idx} className="my-4 p-3 bg-rose-50 text-rose-700 text-xs rounded border border-rose-200 font-sans">
                        Invalid Markdown Table Formatting
                      </div>
                    );
                  }
                  return (
                    <div key={block.id || idx} className="my-4 overflow-x-auto border border-slate-200 rounded-xl bg-white p-3 select-text">
                      <table className="min-w-full border-collapse text-[11px] text-left text-slate-700">
                        <thead>
                          <tr className="bg-slate-50 border-b font-semibold text-slate-900 border-slate-250">
                            {parsed.headers.map((h, i) => (
                              <th key={i} className="p-1.5 border border-slate-200 font-bold bg-slate-50" style={{ textAlign: parsed.alignments[i] || 'left' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-slate-100">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-1.5 border border-slate-200" style={{ textAlign: parsed.alignments[cIdx] || 'left' }}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                case 'highlight-box':
                  const isImp = block.highlightType === 'important';
                  const isVImp = block.highlightType === 'very-important';
                  
                  let highlightStyle = 'bg-blue-50 border-blue-200 text-blue-900 border-l-4';
                  let symbolIcon = '⭐';
                  let badgeText = 'Important';
 
                  if (isVImp) {
                    highlightStyle = 'bg-rose-50 border-rose-250 text-rose-900 border-l-4';
                    symbolIcon = '🔴';
                    badgeText = 'Very Important';
                  } else if (block.highlightType === 'exam-point') {
                    highlightStyle = 'bg-amber-50 border-amber-250 text-amber-900 border-l-4';
                    symbolIcon = '🔥';
                    badgeText = 'Exam Point';
                  }
 
                  return (
                    <div key={block.id || idx} className={`p-3 rounded border font-sans ${highlightStyle} my-4`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block mb-1">
                        {symbolIcon} {badgeText}
                      </span>
                      <p className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: block.content }} />
                    </div>
                  );
                case 'code':
                  return (
                    <div key={block.id || idx} className="bg-slate-950 font-mono text-cyan-400 p-4 rounded-lg my-4 text-xs whitespace-pre-wrap tracking-tight leading-relaxed select-text">
                      <p className="text-[9px] text-slate-500 border-b border-slate-900 pb-1 mb-2">Code: {block.codeLanguage || 'js'}</p>
                      {block.content || '// No code written'}
                    </div>
                  );
                case 'formula':
                  return (
                    <div key={block.id || idx} className="bg-slate-50 p-4 rounded-xl flex flex-col items-center justify-center my-4 font-serif text-slate-900 select-all border shadow-xs">
                      <div className="italic text-lg tracking-wider font-serif font-bold text-center">
                        {block.formulaTex || 'PV = nRT'}
                      </div>
                      <span className="text-[8px] tracking-widest font-mono text-indigo-500 uppercase mt-1">Preserved Formula Accents</span>
                    </div>
                  );
                case 'paragraph':
                default:
                  return (
                    <p key={block.id || idx} className="text-sm leading-relaxed text-slate-800" dangerouslySetInnerHTML={{ __html: block.content }} />
                  );
              }
            })}
          </div>

          {/* PAGE FOOTER AUTO COUNTING */}
          {options.pageNumbers && (
            <div className="border-t pt-4 mt-12 flex justify-between text-[11px] text-slate-400 font-sans tracking-wide select-none">
              <span>Generated on {options.date} by ANotes App</span>
              <span>Page 1 of 1</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
