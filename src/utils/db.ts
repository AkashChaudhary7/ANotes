import { Block, Note, Folder } from '../types';

const DB_NAME = 'anotes_db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' });
      }
    };
  });
}

export async function getFolders(): Promise<Folder[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('folders', 'readonly');
    const store = transaction.objectStore('folders');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFolder(folder: Folder): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('folders', 'readwrite');
    const store = transaction.objectStore('folders');
    const request = store.put(folder);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['folders', 'notes'], 'readwrite');
    const folderStore = transaction.objectStore('folders');
    const noteStore = transaction.objectStore('notes');

    // Delete folder
    folderStore.delete(id);

    // Un-parent notes in this folder or optionally delete them
    // For safety, we will move them to 'No Folder' (null folderId)
    const notesReq = noteStore.getAll();
    notesReq.onsuccess = () => {
      const notes: Note[] = notesReq.result || [];
      notes.forEach(note => {
        if (note.folderId === id) {
          note.folderId = null;
          note.updatedAt = Date.now();
          noteStore.put(note);
        }
      });
      resolve();
    };
    notesReq.onerror = () => reject(notesReq.error);
  });
}

export async function getNotes(): Promise<Note[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('notes', 'readonly');
    const store = transaction.objectStore('notes');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveNote(note: Note): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('notes', 'readwrite');
    const store = transaction.objectStore('notes');
    const request = store.put(note);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteNote(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('notes', 'readwrite');
    const store = transaction.objectStore('notes');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function pruneExpiredNotes(): Promise<void> {
  const db = await openDB();
  const notes = await getNotes();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const expiredNoteIds = notes
    .filter(note => note.isDeleted && note.deletedAt && (now - note.deletedAt) > thirtyDays)
    .map(note => note.id);

  if (expiredNoteIds.length > 0) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('notes', 'readwrite');
      const store = transaction.objectStore('notes');
      for (const id of expiredNoteIds) {
        store.delete(id);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Seed Initial Data
export async function seedInitialDataIfNeeded(): Promise<{ folders: Folder[]; notes: Note[] }> {
  await pruneExpiredNotes();
  const existingFolders = await getFolders();
  const existingNotes = await getNotes();

  if (existingFolders.length > 0 || existingNotes.length > 0) {
    return { folders: existingFolders, notes: existingNotes };
  }

  // Create Folders
  const folders: Folder[] = [
    { id: 'f-sociology', name: 'Sociology', color: 'bg-blue-50 text-blue-700 border-blue-200', createdAt: Date.now() - 5000 },
    { id: 'f-ssc', name: 'SSC', color: 'bg-amber-50 text-amber-700 border-amber-200', createdAt: Date.now() - 4000 },
    { id: 'f-personal', name: 'Personal', color: 'bg-purple-50 text-purple-700 border-purple-200', createdAt: Date.now() - 3000 },
  ];

  // Save Folders
  for (const folder of folders) {
    await saveFolder(folder);
  }

  // Create Notes
  const notes: Note[] = [
    {
      id: 'n-culture',
      folderId: 'f-sociology',
      title: 'Culture & Society',
      coverEmoji: '🌍',
      coverImage: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      createdAt: Date.now() - 2500,
      updatedAt: Date.now() - 2500,
      blocks: [
        { id: 'b1', type: 'heading-1', content: 'Culture, Values, and Beliefs' },
        { id: 'b2', type: 'paragraph', content: 'Culture is the core fabric of any human society. It comprises values, norms, language, symbols, and beliefs that define how individuals interact.' },
        { id: 'b3', type: 'highlight-box', content: 'Culture is not genetically inherited, but socially learned and transmitted across generations.', highlightType: 'important' },
        { id: 'b4', type: 'heading-2', content: 'Three Pillars of Culture' },
        { id: 'b5', type: 'bullet-list-item', content: '<b>Values:</b> Abstract ideals about what is good, right, and desirable in a society.' },
        { id: 'b6', type: 'bullet-list-item', content: '<b>Norms:</b> Rules and expectations that guide behavior (Folkways, Mores, and Laws).' },
        { id: 'b7', type: 'bullet-list-item', content: '<b>Beliefs:</b> Specific statements or convictions that people hold to be true.' },
        { id: 'b8', type: 'quote', content: 'Culture represents the shared designs for living which form the template of human response. — Clyde Kluckhohn' },
        { id: 'b9', type: 'heading-2', content: 'Sanskritization & Acculturation' },
        { id: 'b10', type: 'paragraph', content: 'Two major processes of cultural change in the Indian context:' },
        { id: 'b11', type: 'numbered-list-item', content: '<b>Sanskritization:</b> A process by which a custom, ritual, or ideology of a dominant group is adopted by lower strata to seek upward social mobility.' },
        { id: 'b12', type: 'numbered-list-item', content: '<b>Acculturation:</b> The exchange of cultural features that results when groups of individuals having different cultures come into continuous first-hand contact.' },
        { id: 'b13', type: 'highlight-box', content: 'M.N. Srinivas introduced the term Sanskritization in Sociology.', highlightType: 'exam-point' },
        { id: 'b14', type: 'heading-2', content: 'Cultural Elements Matrix' },
        {
          id: 'b15',
          type: 'table',
          content: '',
          tableData: [
            ['Cultural Concept', 'Primary Characteristic', 'Sociological Perspective'],
            ['Ethnocentrism', 'Evaluating other cultures using own criteria', 'William Graham Sumner'],
            ['Cultural Relativism', 'Understanding culture by its own rules', 'Franz Boas'],
            ['Xenocentrism', 'Preferring foreign cultural ideas', 'Modern Consumer Culture']
          ]
        },
        { id: 'b16', type: 'heading-2', content: 'Example of Cultural Synthesis' },
        { id: 'b17', type: 'paragraph', content: 'भारतीय संस्कृति विविधता में एकता का उत्कृष्ट उदाहरण प्रस्तुत करती है।' },
        { id: 'b18', type: 'paragraph', content: 'Indian culture presents an excellent example of unity in diversity.' }
      ]
    },
    {
      id: 'n-family',
      folderId: 'f-sociology',
      title: 'Family System & Matriarchy',
      coverEmoji: '🏡',
      coverImage: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
      createdAt: Date.now() - 2000,
      updatedAt: Date.now() - 2000,
      blocks: [
        { id: 'f1', type: 'heading-1', content: 'The Sociology of Family' },
        { id: 'f2', type: 'paragraph', content: 'Family is the primary unit of socialization. Sociologists study its dynamic structures across modern and traditional spheres.' },
        { id: 'f3', type: 'heading-2', content: 'Key Family Models' },
        { id: 'f4', type: 'bullet-list-item', content: '<b>Nuclear Family:</b> Consists of household partners and their offspring.' },
        { id: 'f5', type: 'bullet-list-item', content: '<b>Joint/Extended Family:</b> Multigenerational living including uncles, aunts, and cousins.' },
        { id: 'f6', type: 'bullet-list-item', content: '<b>Matrilocal Family:</b> Re-centering residency around the female lineage (e.g., Khasi tribe in India).' },
        { id: 'f7', type: 'highlight-box', content: 'Khasi and Garo tribes of Meghalaya exhibit strong matrilineal structures.', highlightType: 'very-important' }
      ]
    },
    {
      id: 'n-reasoning',
      folderId: 'f-ssc',
      title: 'Coding-Decoding Tricks',
      coverEmoji: '🧠',
      coverImage: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
      createdAt: Date.now() - 1500,
      updatedAt: Date.now() - 1500,
      blocks: [
        { id: 'r1', type: 'heading-1', content: 'SSC Reasoning: Coding & Decoding' },
        { id: 'r2', type: 'paragraph', content: 'Coding-Decoding is one of the highest-weightage topics in the SSC General Intelligence section. Let\'s master the core shortcuts.' },
        { id: 'r3', type: 'heading-2', content: '1. Alphabet Position Values (EJOTY Trick)' },
        { id: 'r4', type: 'paragraph', content: 'Remember the word <b>EJOTY</b> to map letter positions instantly:' },
        { id: 'r5', type: 'highlight-box', content: 'E = 5 | J = 10 | O = 15 | T = 20 | Y = 25', highlightType: 'important' },
        { id: 'r6', type: 'heading-2', content: '2. Opposite Letter Pairs (Sum is 27)' },
        { id: 'r7', type: 'paragraph', content: 'The sum of position numbers of any letter and its opposite is always <b>27</b>.' },
        { id: 'r8', type: 'bullet-list-item', content: 'A (1) ↔ Z (26) : 1 + 26 = 27' },
        { id: 'r9', type: 'bullet-list-item', content: 'B (2) ↔ Y (25) : 2 + 25 = 27' },
        { id: 'r10', type: 'bullet-list-item', content: 'H (8) ↔ S (19) : 8 + 19 = 27 (Remember <i>High School</i>)' },
        { id: 'r11', type: 'bullet-list-item', content: 'K (11) ↔ P (16) : 11 + 16 = 27 (Remember <i>Kurukshetra Prasad / KP</i>)' }
      ]
    },
    {
      id: 'n-gs',
      folderId: 'f-ssc',
      title: 'Indian Constitution Quick Ref',
      coverEmoji: '📜',
      coverImage: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)',
      createdAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000,
      blocks: [
        { id: 'g1', type: 'heading-1', content: 'Salient Features of the Indian Constitution' },
        { id: 'g2', type: 'highlight-box', content: 'भारतीय संविधान विश्व का सबसे बड़ा लिखित संविधान है।<br/>The Constitution of India is the supreme law of India.', highlightType: 'very-important' },
        { id: 'g3', type: 'heading-2', content: 'Fundamental Rights (Part III)' },
        { id: 'g4', type: 'paragraph', content: 'These rights are enshrined in Articles 12 to 35, borrowed from the US Constitution:' },
        { id: 'g5', type: 'bullet-list-item', content: '<b>Article 14:</b> Equality before Law' },
        { id: 'g6', type: 'bullet-list-item', content: '<b>Article 19:</b> Freedom of Speech and Expression' },
        { id: 'g7', type: 'bullet-list-item', content: '<b>Article 21:</b> Protection of Life and Personal Liberty' },
        { id: 'g8', type: 'bullet-list-item', content: '<b>Article 32:</b> Right to Constitutional Remedies (Called the "Heart & Soul" of the Constitution by Dr. B.R. Ambedkar)' }
      ]
    },
    {
      id: 'n-diary',
      folderId: 'f-personal',
      title: 'Self-Reflections & Plans',
      coverEmoji: '✍️',
      coverImage: 'linear-gradient(135deg, #b91c1c 0%, #f87171 100%)',
      createdAt: Date.now() - 500,
      updatedAt: Date.now() - 500,
      blocks: [
        { id: 'd1', type: 'heading-1', content: 'Personal Diary & Gratitude' },
        { id: 'd2', type: 'paragraph', content: '<i>13 June 2026</i> — Sitting down to capture goals and build my workspace setup. Today is all about focus and progress.' },
        { id: 'd3', type: 'heading-2', content: 'Weekly Checklist' },
        { id: 'd4', type: 'checklist-item', content: 'Complete Sociology reading assignments', checked: true },
        { id: 'd5', type: 'checklist-item', content: 'Revise Coding-Decoding opposites trick', checked: false },
        { id: 'd6', type: 'checklist-item', content: 'Drink 3 liters of water daily', checked: true },
        { id: 'd7', type: 'heading-2', content: 'Thought of the Day' },
        { id: 'd8', type: 'quote', content: 'The only limit to our realization of tomorrow will be our doubts of today.' }
      ]
    }
  ];

  for (const note of notes) {
    await saveNote(note);
  }

  return { folders, notes };
}
