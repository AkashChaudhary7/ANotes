import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection, query, where, getDocFromServer } from 'firebase/firestore';
import { Folder, Note } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export function getLocalClientId(): string {
  let id = localStorage.getItem('anotes-local-client-id');
  if (!id) {
    id = 'node_' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('anotes-local-client-id', id);
  }
  return id;
}

export const auth = {
  currentUser: {
    uid: getLocalClientId(),
    displayName: 'Local Device Client',
    email: 'local@device.backup'
  }
};

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function loginAnonymously(): Promise<any> {
  return { user: auth.currentUser };
}

export async function logoutUser(): Promise<void> {
  // Safe no-op as auth handles automatic silent sync
}

export function onAuthStateChanged(_auth: any, callback: (user: any) => void) {
  const timer = setTimeout(() => {
    callback(auth.currentUser);
  }, 100);
  return () => clearTimeout(timer);
}

// Sync utilities
function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned;
  }
  return obj;
}

export async function saveFolderToFirestore(folder: Folder, userId: string): Promise<void> {
  const path = `folders/${folder.id}`;
  try {
    const folderDoc = cleanUndefined({
      ...folder,
      userId
    });
    await setDoc(doc(db, 'folders', folder.id), folderDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFolderFromFirestore(folderId: string, _userId: string): Promise<void> {
  const path = `folders/${folderId}`;
  try {
    await deleteDoc(doc(db, 'folders', folderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveNoteToFirestore(note: Note, userId: string): Promise<void> {
  const path = `notes/${note.id}`;
  try {
    const processedBlocks = note.blocks.map(b => {
      if (b.tableData) {
        return {
          ...b,
          tableData: JSON.stringify(b.tableData) as any
        };
      }
      return b;
    });

    const noteDoc = cleanUndefined({
      ...note,
      userId,
      blocks: processedBlocks,
      // Default folderId to null if undefined, to prevent undefined fields in Firestore payloads
      folderId: note.folderId ?? null
    });
    await setDoc(doc(db, 'notes', note.id), noteDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteNoteFromFirestore(noteId: string, _userId: string): Promise<void> {
  const path = `notes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'notes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getFoldersFromFirestore(userId: string): Promise<Folder[]> {
  const path = 'folders';
  try {
    const q = query(collection(db, 'folders'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const folders: Folder[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      folders.push({
        id: data.id,
        name: data.name,
        color: data.color || undefined,
        createdAt: data.createdAt
      });
    });
    return folders;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getNotesFromFirestore(userId: string): Promise<Note[]> {
  const path = 'notes';
  try {
    const q = query(collection(db, 'notes'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const notes: Note[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const processedBlocks = (data.blocks || []).map((b: any) => {
        if (b.tableData && typeof b.tableData === 'string') {
          try {
            return {
              ...b,
              tableData: JSON.parse(b.tableData)
            };
          } catch (e) {
            console.error('Failed to parse tableData string: ', e);
          }
        }
        return b;
      });

      notes.push({
        id: data.id,
        folderId: data.folderId,
        title: data.title,
        blocks: processedBlocks,
        coverEmoji: data.coverEmoji,
        coverImage: data.coverImage || null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        isDeleted: data.isDeleted || false,
        deletedAt: data.deletedAt,
        pinned: data.pinned || false,
        tags: data.tags || []
      });
    });
    return notes;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}
