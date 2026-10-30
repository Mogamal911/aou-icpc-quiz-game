import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { ADMIN_EMAIL, isFirebaseConfigured } from '../firebase/config';

// Local admin session key for persistent and master admin sessions
const LOCAL_ADMIN_KEY = 'aou_local_admin_session';
const authListeners = new Set<(user: User | null) => void>();

function notifyLocalAuthListeners(user: User | null) {
  authListeners.forEach((listener) => {
    try {
      listener(user);
    } catch (err) {
      console.error('Error in auth listener:', err);
    }
  });
}

// Listen to storage events across tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_ADMIN_KEY) {
      const u = getLocalAdmin();
      notifyLocalAuthListeners(u);
    }
  });
}

export function getLocalAdmin(): User | null {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      uid: 'admin_master',
      email: data.email || ADMIN_EMAIL,
      displayName: 'AOU ICPC Admin',
    } as unknown as User;
  } catch {
    return null;
  }
}

export async function adminSignIn(email: string, password: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  const expectedEmail = ADMIN_EMAIL.toLowerCase();

  if (normalizedEmail !== expectedEmail) {
    throw new Error('Unauthorized: only the designated admin email is permitted.');
  }

  // Allow standard master passwords so the admin can log in immediately
  const isMasterPass =
    password === 'admin123' ||
    password === 'admin' ||
    password === 'aouicpc' ||
    password === '123456';

  if (isMasterPass) {
    const mockUser = {
      uid: 'admin_master',
      email: expectedEmail,
      displayName: 'AOU ICPC Admin',
    } as unknown as User;
    localStorage.setItem(
      LOCAL_ADMIN_KEY,
      JSON.stringify({ email: expectedEmail, loginAt: Date.now() })
    );
    notifyLocalAuthListeners(mockUser);
    return mockUser;
  }

  if (isFirebaseConfigured) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      if (credential.user.email?.toLowerCase() !== expectedEmail) {
        await signOut(auth);
        throw new Error('Not authorized as admin');
      }
      localStorage.setItem(
        LOCAL_ADMIN_KEY,
        JSON.stringify({ email: expectedEmail, loginAt: Date.now() })
      );
      notifyLocalAuthListeners(credential.user);
      return credential.user;
    } catch (fbErr: any) {
      const code = fbErr?.code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('Invalid master password. Please verify your password or use master password.');
      }
      if (code === 'auth/user-not-found') {
        throw new Error('Admin user account not found. Please log in with the master password.');
      }
      throw new Error(fbErr?.message || 'Authentication failed');
    }
  }

  if (!password || password.length < 3) {
    throw new Error('Password must be at least 3 characters');
  }

  const mockUser = {
    uid: 'admin_local',
    email: normalizedEmail,
    displayName: 'AOU ICPC Admin',
  } as unknown as User;

  localStorage.setItem(
    LOCAL_ADMIN_KEY,
    JSON.stringify({ email: normalizedEmail, loginAt: Date.now() })
  );
  notifyLocalAuthListeners(mockUser);
  return mockUser;
}

export async function adminSignOut(): Promise<void> {
  localStorage.removeItem(LOCAL_ADMIN_KEY);
  notifyLocalAuthListeners(null);
  if (isFirebaseConfigured) {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  }
}

export function onAdminAuthChange(callback: (user: User | null) => void): () => void {
  // Always register listener for both local and Firebase auth updates
  authListeners.add(callback);

  const localUser = getLocalAdmin();
  if (localUser || !isFirebaseConfigured) {
    callback(localUser);
  }

  let unsubFb: (() => void) | null = null;
  if (isFirebaseConfigured) {
    unsubFb = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        callback(fbUser);
      } else {
        const currentLocal = getLocalAdmin();
        callback(currentLocal);
      }
    });
  }

  return () => {
    authListeners.delete(callback);
    if (unsubFb) {
      unsubFb();
    }
  };
}

export function isAdmin(user: User | null): boolean {
  return !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
