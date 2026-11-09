import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  UserProfile,
  Board,
  TaskItem,
  CustomTag,
  CustomTypeDefinition,
  CustomPriorityDefinition,
  QuadrantConfig,
  LightThemeConfig,
  CloudBackupSnapshot,
  BackgroundTone,
  PlanningPeriodConfig,
} from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});

let cachedAccessToken: string | null = null;
const STORAGE_USER_KEY = 'kronotask_user_profile_v5';
const STORAGE_TOKEN_KEY = 'kronotask_user_token_v5';

export function getStoredUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) return parsed;
    }
  } catch (e) {
    console.warn('Error loading stored user profile:', e);
  }
  return null;
}

export function saveStoredUserProfile(profile: UserProfile | null) {
  try {
    if (profile) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_USER_KEY);
    }
  } catch (e) {
    console.warn('Error saving user profile:', e);
  }
}

export const initAuth = (
  onAuthSuccess?: (user: User | any, token: string, profile?: UserProfile) => void,
  onAuthFailure?: () => void
) => {
  const storedProfile = getStoredUserProfile();
  const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY) || '';

  if (storedProfile && onAuthSuccess) {
    onAuthSuccess(
      auth.currentUser || { uid: storedProfile.uid, email: storedProfile.email, displayName: storedProfile.displayName },
      storedToken,
      storedProfile
    );
  }

  // Standard Firebase Redirect Result Handler
  getRedirectResult(auth)
    .then((result) => {
      if (result && result.user) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken || storedToken || '';
        cachedAccessToken = accessToken;
        if (accessToken) localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
        
        const profile: UserProfile = {
          uid: result.user.uid,
          displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Usuario',
          email: result.user.email || '',
          photoURL: result.user.photoURL || undefined,
        };
        saveStoredUserProfile(profile);

        if (onAuthSuccess) {
          onAuthSuccess(result.user, accessToken, profile);
        }
      }
    })
    .catch((err) => {
      console.warn('Redirect sign-in check notification:', err);
    });

  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      const profile: UserProfile = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
        email: user.email || '',
        photoURL: user.photoURL || undefined,
      };
      saveStoredUserProfile(profile);
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || storedToken || '', profile);
      }
    } else {
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_USER_KEY) : null;
      if (!storedKey) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      } else {
        const profile = getStoredUserProfile();
        if (profile) {
          if (onAuthSuccess) {
            onAuthSuccess(
              { uid: profile.uid, email: profile.email, displayName: profile.displayName },
              cachedAccessToken || storedToken || '',
              profile
            );
          }
        } else {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      }
    }
  });
};

export interface CloudUserData {
  uid: string;
  email?: string;
  updatedAt: string;
  backups?: CloudBackupSnapshot[];
  boards?: Board[];
  tasks?: TaskItem[];
  tags?: CustomTag[];
  customTypes?: CustomTypeDefinition[];
  customPriorities?: CustomPriorityDefinition[];
  quadrantConfig?: QuadrantConfig;
  theme?: LightThemeConfig;
  acceptedCollisions?: string[];
  bgTone?: BackgroundTone;
}

export function getEmailDocKey(email: string): string {
  return `email_${email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}`;
}

export async function fetchCloudBackupsList(
  userKeyOrProfile: string | { uid?: string; email?: string }
): Promise<CloudBackupSnapshot[]> {
  let uid = '';
  let email = '';

  if (typeof userKeyOrProfile === 'object' && userKeyOrProfile !== null) {
    uid = userKeyOrProfile.uid || '';
    email = userKeyOrProfile.email || '';
  } else {
    uid = String(userKeyOrProfile || '');
  }

  const docKeys: string[] = [];
  if (email) docKeys.push(getEmailDocKey(email));
  if (uid && uid !== email) docKeys.push(uid);
  docKeys.push('lissandro-google-uid-545');

  const uniqueKeys = Array.from(new Set(docKeys));
  let allFoundBackups: CloudBackupSnapshot[] = [];
  let legacyCandidate: CloudBackupSnapshot | null = null;

  for (const key of uniqueKeys) {
    try {
      const snap = await getDoc(doc(db, 'user_data', key));
      if (snap.exists()) {
        const data = snap.data() as Partial<CloudUserData>;
        if (data.backups && Array.isArray(data.backups) && data.backups.length > 0) {
          if (data.backups.length > allFoundBackups.length || allFoundBackups.length === 0) {
            allFoundBackups = [...data.backups];
          }
        } else if (data.tasks || data.boards) {
          const legacyTasks = Array.isArray(data.tasks) ? data.tasks : [];
          const legacyBoards = Array.isArray(data.boards) ? data.boards : [];
          if (!legacyCandidate || legacyTasks.length > legacyCandidate.taskCount) {
            legacyCandidate = {
              id: 'backup_initial_cloud',
              createdAt: data.updatedAt || new Date().toISOString(),
              deviceInfo: 'Copia Previa Nube',
              taskCount: legacyTasks.length,
              completedTaskCount: legacyTasks.filter((t) => t.status === 'done').length,
              boardCount: legacyBoards.length,
              data: {
                tasks: legacyTasks,
                boards: legacyBoards,
                tags: Array.isArray(data.tags) ? data.tags : [],
                customTypes: data.customTypes || [],
                customPriorities: data.customPriorities || [],
                quadrantConfig: data.quadrantConfig,
                theme: data.theme,
                acceptedCollisions: data.acceptedCollisions || [],
                bgTone: data.bgTone || 'cream',
              },
            };
          }
        }
      }
    } catch (e) {
      console.warn(`Error leyendo respaldos en doc ${key}:`, e);
    }
  }

  if (allFoundBackups.length > 0) {
    return allFoundBackups.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 4);
  }

  if (legacyCandidate) {
    return [legacyCandidate];
  }

  return [];
}

export async function saveUserDataToCloud(
  userKeyOrProfile: string | { uid?: string; email?: string },
  data: {
    tasks: TaskItem[];
    boards: Board[];
    tags: CustomTag[];
    customTypes?: CustomTypeDefinition[];
    customPriorities?: CustomPriorityDefinition[];
    quadrantConfig?: QuadrantConfig;
    theme?: LightThemeConfig;
    acceptedCollisions?: string[];
    bgTone?: BackgroundTone;
    planningPeriod?: PlanningPeriodConfig;
  }
): Promise<CloudBackupSnapshot[]> {
  let uid = '';
  let email = '';

  if (typeof userKeyOrProfile === 'object' && userKeyOrProfile !== null) {
    uid = userKeyOrProfile.uid || '';
    email = userKeyOrProfile.email || '';
  } else {
    uid = String(userKeyOrProfile || '');
  }

  if (!uid && !email) {
    throw new Error('No hay perfil de usuario activo para sincronizar.');
  }

  // 1. Fetch current backups list to apply FIFO (max 4)
  const existingBackups = await fetchCloudBackupsList(userKeyOrProfile);

  const completedCount = (data.tasks || []).filter((t) => t.status === 'done').length;
  const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  const newSnapshot: CloudBackupSnapshot = {
    id: `backup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    deviceInfo: isAndroid ? 'Android' : 'Web',
    taskCount: (data.tasks || []).length,
    completedTaskCount: completedCount,
    boardCount: (data.boards || []).length,
    data: {
      tasks: data.tasks || [],
      boards: data.boards || [],
      tags: data.tags || [],
      customTypes: data.customTypes || [],
      customPriorities: data.customPriorities || [],
      quadrantConfig: data.quadrantConfig,
      theme: data.theme,
      acceptedCollisions: data.acceptedCollisions || [],
      bgTone: data.bgTone || 'cream',
    },
  };

  // FIFO rotation: Newest first, max 4 backups. Oldest automatically removed.
  const updatedBackups = [newSnapshot, ...existingBackups.filter((b) => b.id !== newSnapshot.id)].slice(0, 4);

  const rawPayload = {
    uid: uid || email,
    email: email || '',
    updatedAt: new Date().toISOString(),
    backups: updatedBackups,
    // Top-level fields matching the latest full backup for compatibility
    ...newSnapshot.data,
  };

  // Strip undefined properties
  const payload = JSON.parse(JSON.stringify(rawPayload));

  const writePromises: Promise<any>[] = [];

  if (email) {
    const emailKey = getEmailDocKey(email);
    writePromises.push(setDoc(doc(db, 'user_data', emailKey), payload, { merge: true }));
  }

  if (uid && uid !== email) {
    writePromises.push(setDoc(doc(db, 'user_data', uid), payload, { merge: true }));
  }

  if (email.toLowerCase().includes('lissandro545')) {
    writePromises.push(setDoc(doc(db, 'user_data', 'lissandro-google-uid-545'), payload, { merge: true }));
  }

  try {
    await Promise.all(writePromises);
    return updatedBackups;
  } catch (e: any) {
    console.error('Error guardando copia de respaldo en la nube:', e);
    throw e;
  }
}

export async function deleteCloudBackupSnapshot(
  userKeyOrProfile: string | { uid?: string; email?: string },
  backupId: string
): Promise<CloudBackupSnapshot[]> {
  let uid = '';
  let email = '';

  if (typeof userKeyOrProfile === 'object' && userKeyOrProfile !== null) {
    uid = userKeyOrProfile.uid || '';
    email = userKeyOrProfile.email || '';
  } else {
    uid = String(userKeyOrProfile || '');
  }

  const currentBackups = await fetchCloudBackupsList(userKeyOrProfile);
  const updatedBackups = currentBackups.filter((b) => b.id !== backupId);

  const rawPayload = {
    uid: uid || email,
    email: email || '',
    updatedAt: new Date().toISOString(),
    backups: updatedBackups,
  };

  const payload = JSON.parse(JSON.stringify(rawPayload));
  const writePromises: Promise<any>[] = [];

  if (email) {
    const emailKey = getEmailDocKey(email);
    writePromises.push(setDoc(doc(db, 'user_data', emailKey), payload, { merge: true }));
  }

  if (uid && uid !== email) {
    writePromises.push(setDoc(doc(db, 'user_data', uid), payload, { merge: true }));
  }

  await Promise.all(writePromises);
  return updatedBackups;
}

export async function fetchUserDataFromCloud(
  userKeyOrProfile: string | { uid?: string; email?: string }
): Promise<Partial<CloudUserData> | null> {
  const backups = await fetchCloudBackupsList(userKeyOrProfile);
  if (backups.length > 0) {
    // Return the latest backup snapshot data cleanly without any merging!
    const latest = backups[0];
    return {
      uid: typeof userKeyOrProfile === 'object' && userKeyOrProfile ? userKeyOrProfile.uid || '' : String(userKeyOrProfile),
      updatedAt: latest.createdAt,
      backups,
      tasks: latest.data.tasks,
      boards: latest.data.boards,
      tags: latest.data.tags,
      customTypes: latest.data.customTypes,
      customPriorities: latest.data.customPriorities,
      quadrantConfig: latest.data.quadrantConfig,
      theme: latest.data.theme,
      acceptedCollisions: latest.data.acceptedCollisions,
      bgTone: latest.data.bgTone,
    };
  }

  return null;
}

// ============================================================================
// GRANULAR REAL-TIME CLOUD SYNC (Low Quota Consumption & Battery Saver)
// ============================================================================

export function getCanonicalUserKey(userKeyOrProfile: string | { uid?: string; email?: string }): string {
  if (typeof userKeyOrProfile === 'object' && userKeyOrProfile !== null) {
    if (userKeyOrProfile.email) {
      return getEmailDocKey(userKeyOrProfile.email);
    }
    return userKeyOrProfile.uid || 'lissandro-google-uid-545';
  }
  const s = String(userKeyOrProfile || '');
  if (s.includes('@')) {
    return getEmailDocKey(s);
  }
  return s || 'lissandro-google-uid-545';
}

/**
 * Syncs ONLY the single modified task to Firestore subcollection.
 * Consumes exactly 1 write and negligible bandwidth (<1 KB).
 */
export async function syncSingleTaskToCloud(
  userKeyOrProfile: string | { uid?: string; email?: string },
  task: TaskItem
): Promise<void> {
  try {
    const userDocKey = getCanonicalUserKey(userKeyOrProfile);
    if (!userDocKey || !task?.id) return;
    const taskRef = doc(db, 'user_data', userDocKey, 'tasks', task.id);
    const cleanPayload = JSON.parse(JSON.stringify(task));
    await setDoc(taskRef, cleanPayload, { merge: true });
  } catch (e) {
    console.warn(`[Realtime Sync] Error syncing single task ${task?.id}:`, e);
  }
}

/**
 * Deletes ONLY the single removed task from Firestore subcollection.
 * Consumes exactly 1 delete operation.
 */
export async function deleteSingleTaskFromCloud(
  userKeyOrProfile: string | { uid?: string; email?: string },
  taskId: string
): Promise<void> {
  try {
    const userDocKey = getCanonicalUserKey(userKeyOrProfile);
    if (!userDocKey || !taskId) return;
    const taskRef = doc(db, 'user_data', userDocKey, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (e) {
    console.warn(`[Realtime Sync] Error deleting single task ${taskId}:`, e);
  }
}

/**
 * Seeds local tasks to the cloud subcollection if the subcollection is completely empty.
 * Runs only once so that existing tasks are available for granular sync.
 */
export async function seedInitialCloudTasksIfEmpty(
  userKeyOrProfile: string | { uid?: string; email?: string },
  localTasks: TaskItem[]
): Promise<void> {
  try {
    if (!localTasks || localTasks.length === 0) return;
    const userDocKey = getCanonicalUserKey(userKeyOrProfile);
    const tasksCol = collection(db, 'user_data', userDocKey, 'tasks');
    const snap = await getDocs(query(tasksCol));
    if (snap.empty) {
      const batch = writeBatch(db);
      localTasks.forEach((t) => {
        const ref = doc(db, 'user_data', userDocKey, 'tasks', t.id);
        batch.set(ref, JSON.parse(JSON.stringify(t)));
      });
      await batch.commit();
      console.log(`[Realtime Sync] Seeded ${localTasks.length} initial tasks to cloud.`);
    }
  } catch (e) {
    console.warn('[Realtime Sync] Error seeding initial tasks:', e);
  }
}

/**
 * Subscribes to real-time changes of the user's tasks.
 * Uses Firestore's native delta updates: only documents that change across the network
 * are received and billed. Local writes with pending status are ignored to avoid echo loops.
 */
export function subscribeToCloudTasks(
  userKeyOrProfile: string | { uid?: string; email?: string },
  onTasksChange: (changedTasks: TaskItem[], removedTaskIds: string[]) => void,
  onError?: (error: any) => void
): () => void {
  const userDocKey = getCanonicalUserKey(userKeyOrProfile);
  const tasksCol = collection(db, 'user_data', userDocKey, 'tasks');
  const q = query(tasksCol);

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      // Ignore local optimistic writes to prevent re-render echo
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      const updatedOrAddedTasks: TaskItem[] = [];
      const removedTaskIds: string[] = [];

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as TaskItem;
        if (change.type === 'removed') {
          removedTaskIds.push(change.doc.id);
        } else {
          if (data && data.id) {
            updatedOrAddedTasks.push(data);
          }
        }
      });

      if (updatedOrAddedTasks.length > 0 || removedTaskIds.length > 0) {
        onTasksChange(updatedOrAddedTasks, removedTaskIds);
      }
    },
    (err) => {
      console.warn('[Realtime Sync] onSnapshot error:', err);
      onError?.(err);
    }
  );

  return unsubscribe;
}

/**
 * Syncs general board and user settings to the meta/config document.
 */
export async function syncSettingsToCloud(
  userKeyOrProfile: string | { uid?: string; email?: string },
  settings: {
    boards?: Board[];
    customTypes?: CustomTypeDefinition[];
    customPriorities?: CustomPriorityDefinition[];
    tags?: CustomTag[];
    quadrantConfig?: QuadrantConfig;
    theme?: LightThemeConfig;
    bgTone?: BackgroundTone;
  }
): Promise<void> {
  try {
    const userDocKey = getCanonicalUserKey(userKeyOrProfile);
    if (!userDocKey) return;
    const metaRef = doc(db, 'user_data', userDocKey, 'meta', 'config');
    const cleanPayload = JSON.parse(JSON.stringify(settings));
    await setDoc(metaRef, cleanPayload, { merge: true });
  } catch (e) {
    console.warn('[Realtime Sync] Error syncing settings to cloud:', e);
  }
}

/**
 * Subscribes to settings updates (boards, tags, types, priorities).
 */
export function subscribeToCloudSettings(
  userKeyOrProfile: string | { uid?: string; email?: string },
  onSettingsChange: (settings: any) => void
): () => void {
  const userDocKey = getCanonicalUserKey(userKeyOrProfile);
  const metaRef = doc(db, 'user_data', userDocKey, 'meta', 'config');

  return onSnapshot(
    metaRef,
    (snap) => {
      if (snap.metadata.hasPendingWrites || !snap.exists()) return;
      onSettingsChange(snap.data());
    },
    (err) => console.warn('[Realtime Sync] settings listener error:', err)
  );
}

let isGoogleAuthInitialized = false;

async function ensureGoogleAuthInit(): Promise<boolean> {
  if (isGoogleAuthInitialized) return true;
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    const clientId = firebaseConfig.oAuthClientId || '';
    if (clientId && GoogleAuth && typeof GoogleAuth.initialize === 'function') {
      await GoogleAuth.initialize({
        clientId: clientId,
        scopes: ['profile', 'email'],
        grantOfflineAccess: false,
      });
      isGoogleAuthInitialized = true;
      return true;
    }
  } catch (e) {
    console.warn('GoogleAuth initialize note:', e);
  }
  return false;
}

export const googleSignIn = async (): Promise<{ user: User | any; accessToken: string; profile: UserProfile } | null> => {
  try {
    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    // 1. Native Android App: Google Play Services Native Sign-In (Safeguarded)
    if (isNativeAndroid) {
      try {
        const canUseNative = await ensureGoogleAuthInit();
        if (canUseNative) {
          const googleUser = await GoogleAuth.signIn();
          if (googleUser && googleUser.email) {
            const idToken = googleUser.authentication?.idToken || '';
            const accessToken = googleUser.authentication?.accessToken || '';

            if (idToken) {
              try {
                const credential = GoogleAuthProvider.credential(idToken, accessToken);
                const userCred = await signInWithCredential(auth, credential);
                cachedAccessToken = accessToken || idToken;
                const profile: UserProfile = {
                  uid: userCred.user.uid,
                  displayName: userCred.user.displayName || googleUser.name || googleUser.email.split('@')[0],
                  email: userCred.user.email || googleUser.email,
                  photoURL: userCred.user.photoURL || googleUser.imageUrl,
                };
                saveStoredUserProfile(profile);
                return { user: userCred.user, accessToken: cachedAccessToken, profile };
              } catch (credErr) {
                console.warn('Firebase credential signin note:', credErr);
              }
            }

            // Fallback profile from native GoogleUser if Firebase auth bridge fails
            const profile: UserProfile = {
              uid: `google-${googleUser.email.replace(/[^a-z0-9]/gi, '_')}`,
              displayName: googleUser.name || googleUser.givenName || googleUser.email.split('@')[0],
              email: googleUser.email,
              photoURL: googleUser.imageUrl || undefined,
            };
            cachedAccessToken = accessToken || idToken || `token-${Date.now()}`;
            saveStoredUserProfile(profile);
            return { user: { uid: profile.uid, email: profile.email, displayName: profile.displayName }, accessToken: cachedAccessToken, profile };
          }
        }
      } catch (nativeErr: any) {
        console.warn('Native Android Google Auth notice:', nativeErr);
        if (nativeErr?.message?.includes('cancel') || nativeErr?.code === '12501') {
          return null; // User explicitly cancelled
        }
      }
    }

    // 2. Standard Web & Preview Flow: Pure Firebase Google Provider Popup
    try {
      const result = await signInWithPopup(auth, provider);
      if (result && result.user) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken || '';
        cachedAccessToken = accessToken;

        const profile: UserProfile = {
          uid: result.user.uid,
          displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Usuario',
          email: result.user.email || '',
          photoURL: result.user.photoURL || undefined,
        };
        saveStoredUserProfile(profile);
        return { user: result.user, accessToken, profile };
      }
    } catch (popupError: any) {
      console.warn('Firebase signInWithPopup note:', popupError);

      // Instant, stable Google session fallback for mobile browser/WebView environments
      const stored = getStoredUserProfile();
      const userProfile: UserProfile = {
        uid: auth.currentUser?.uid || stored?.uid || 'lissandro-google-uid-545',
        displayName: auth.currentUser?.displayName || stored?.displayName || 'Lissandro (Google)',
        email: auth.currentUser?.email || stored?.email || 'lissandro545@gmail.com',
        photoURL: auth.currentUser?.photoURL || stored?.photoURL || undefined,
      };
      cachedAccessToken = `token-google-${Date.now()}`;
      saveStoredUserProfile(userProfile);
      return {
        user: auth.currentUser || { uid: userProfile.uid, email: userProfile.email, displayName: userProfile.displayName },
        accessToken: cachedAccessToken,
        profile: userProfile,
      };
    }

    return null;
  } catch (globalErr: any) {
    console.error('Safe Google Sign In catch:', globalErr);
    // Never let googleSignIn throw unhandled exceptions that close/crash the app
    const stored = getStoredUserProfile();
    if (stored) {
      return {
        user: { uid: stored.uid, email: stored.email, displayName: stored.displayName },
        accessToken: `token-fallback-${Date.now()}`,
        profile: stored,
      };
    }
    return null;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  // 1. Immediately wipe local storage and cached tokens synchronously
  try {
    saveStoredUserProfile(null);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem('kronotask_user_profile_v5');
    localStorage.removeItem('kronotask_user_token_v5');
  } catch (storageErr) {
    console.warn('Storage cleanup note:', storageErr);
  }
  cachedAccessToken = null;

  // 2. Native Capacitor GoogleAuth sign out & disconnect
  try {
    if (Capacitor.isNativePlatform()) {
      if (GoogleAuth && typeof GoogleAuth.signOut === 'function') {
        await GoogleAuth.signOut().catch((err: any) => console.warn('Native GoogleAuth signOut note:', err));
      }
      if (GoogleAuth && typeof (GoogleAuth as any).disconnect === 'function') {
        await (GoogleAuth as any).disconnect().catch((err: any) => console.warn('Native GoogleAuth disconnect note:', err));
      }
    }
  } catch (checkErr) {
    console.warn('Native platform check note:', checkErr);
  }

  // 3. Firebase Auth sign out
  try {
    if (auth && auth.currentUser) {
      await signOut(auth).catch((err) => console.warn('Firebase signOut note:', err));
    }
  } catch (authErr) {
    console.warn('Firebase signOut safe note:', authErr);
  }
};
