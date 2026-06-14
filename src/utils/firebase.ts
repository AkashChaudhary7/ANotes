import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection, query, where, getDocFromServer } from 'firebase/firestore';
import { Folder, Note } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

// Sync utilities
export async function saveFolderToFirestore(folder: Folder, userId: string): Promise<void> {
  const path = `folders/${folder.id}`;
  try {
    const folderDoc = {
      ...folder,
      userId
    };
    await setDoc(doc(db, 'folders', folder.id), folderDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFolderFromFirestore(folderId: string, userId: string): Promise<void> {
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
    const noteDoc = {
      ...note,
      userId,
      // Default folderId to null if undefined, to prevent undefined fields in Firestore payloads
      folderId: note.folderId ?? null
    };
    await setDoc(doc(db, 'notes', note.id), noteDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteNoteFromFirestore(noteId: string, userId: string): Promise<void> {
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
      notes.push({
        id: data.id,
        folderId: data.folderId,
        title: data.title,
        blocks: data.blocks || [],
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
