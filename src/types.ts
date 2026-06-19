export interface Block {
  id: string;
  type: 'paragraph' | 'heading-1' | 'heading-2' | 'heading-3' | 'heading-4' | 'bullet-list-item' | 'numbered-list-item' | 'checklist-item' | 'quote' | 'callout' | 'divider' | 'table' | 'markdown-table' | 'image' | 'code' | 'formula' | 'highlight-box';
  content: string;
  checked?: boolean;
  highlightType?: 'important' | 'very-important' | 'exam-point';
  codeLanguage?: string;
  tableData?: string[][]; // Rows and cols
  imageSrc?: string;
  imageCaption?: string;
  formulaTex?: string;
}

export interface Note {
  id: string;
  folderId: string | null;
  title: string;
  blocks: Block[];
  coverEmoji: string;
  coverImage: string | null; // CSS background gradient or image url
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number;
  pinned?: boolean;
  tags?: string[];
}

export interface Folder {
  id: string;
  name: string;
  color?: string; // CSS bg/text class representation
  createdAt: number;
}

export type PremiumTheme = 'academic' | 'modern' | 'royal' | 'dark-professional';

export interface PDFExportOptions {
  theme: PremiumTheme;
  includeCover: boolean;
  author: string;
  date: string;
  subtitle: string;
  autoTOC: boolean;
  pageNumbers: boolean;
  watermarkText: string;
  watermarkEnabled: boolean;
  sectionAutoNumber: boolean;
}

export interface MindNode {
  id: string;
  label: string;
  children: MindNode[];
}
