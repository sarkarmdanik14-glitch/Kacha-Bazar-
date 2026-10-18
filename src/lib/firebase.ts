/**
 * Zero-Dependency Supabase Authoritative Compatibility Shim
 * Firebase has been completely removed in favor of 100% Supabase PostgreSQL & Realtime.
 * This file provides zero-overhead stubs so legacy references resolve safely without
 * any Google Firebase npm packages or network overhead.
 */

export type FirebaseUser = any;
export type ConfirmationResult = any;

export const app: any = { name: "[DEFAULT]", options: {} };
export const auth: any = {
  currentUser: null,
  signOut: async () => {},
  onAuthStateChanged: (_cb: any) => () => {},
};
export const db: any = {};
export const storage: any = {};

export const getStorage = () => storage;
export const ref = (_storage: any, path: string) => ({ fullPath: path });
export const uploadBytes = async () => ({ ref: { fullPath: "" } });
export const getDownloadURL = async () => "";

export const googleProvider: any = {};

export const collection = (_db: any, ...pathSegments: string[]) => ({
  path: pathSegments.join("/"),
  type: "collection",
});

export const doc = (_db: any, ...pathSegments: string[]) => ({
  id: pathSegments[pathSegments.length - 1] || "",
  path: pathSegments.join("/"),
  type: "document",
});

export const getDoc = async (docRef: any) => ({
  id: docRef?.id || "",
  exists: () => false,
  data: () => null,
});

export const getDocFromServer = getDoc;

export const getDocs = async (_queryOrRef: any) => ({
  empty: true,
  docs: [] as any[],
  size: 0,
  forEach: (_cb: any) => {},
});

export const setDoc = async (_docRef: any, _data: any, _options?: any) => {};
export const addDoc = async (_colRef: any, _data: any) => ({ id: `sb_${Date.now()}` });
export const updateDoc = async (_docRef: any, _data: any) => {};
export const deleteDoc = async (_docRef: any) => {};

export const increment = (n: number) => n;
export const Timestamp = {
  now: () => ({ toMillis: () => Date.now(), toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) }),
  fromDate: (d: Date) => ({ toMillis: () => d.getTime(), toDate: () => d, seconds: Math.floor(d.getTime() / 1000) }),
  fromMillis: (m: number) => ({ toMillis: () => m, toDate: () => new Date(m), seconds: Math.floor(m / 1000) })
};
export const serverTimestamp = () => new Date().toISOString();

export const query = (queryRef: any, ..._ops: any[]) => queryRef;
export const where = (..._args: any[]) => ({ type: "where" });
export const orderBy = (..._args: any[]) => ({ type: "orderBy" });
export const limit = (_n: number) => ({ type: "limit" });
export const or = (..._args: any[]) => ({ type: "or" });

export const onSnapshot = (_queryOrRef: any, _onNext: any, _onError?: any) => () => {};

export const writeBatch = (_db?: any) => ({
  set: (_ref: any, _data: any, _opt?: any) => {},
  update: (_ref: any, _data: any) => {},
  delete: (_ref: any) => {},
  commit: async () => {},
});

export async function runTransaction<T = any>(_dbOrFn: any, updateFunction?: ((transaction: any) => Promise<T>) | any): Promise<T> {
  const fn = typeof _dbOrFn === "function" ? _dbOrFn : updateFunction;
  if (typeof fn === "function") {
    const res = await fn({
      get: async () => ({ exists: () => false, data: () => ({}) }),
      set: () => {},
      update: () => {},
      delete: () => {},
    });
    return (res !== undefined ? res : ({ success: true } as any)) as T;
  }
  return { success: true } as any;
}

export const arrayUnion = (...elements: any[]) => elements;

export class RecaptchaVerifier {
  constructor(..._args: any[]) {}
  clear() {}
  render() { return Promise.resolve(0); }
}

export const EmailAuthProvider = {
  credential: (..._args: any[]) => ({}),
};

export const reauthenticateWithCredential = async (..._args: any[]) => {};
export const signInWithPopup = async (..._args: any[]) => ({ user: null } as any);
export const signInWithEmailAndPassword = async (..._args: any[]) => ({ user: null } as any);
export const createUserWithEmailAndPassword = async (..._args: any[]) => ({ user: null } as any);
export const signInWithPhoneNumber = async (..._args: any[]) => ({
  confirm: async (_code: string) => ({ user: null })
} as any);
export const signOut = async (..._args: any[]) => {};
export const onAuthStateChanged = (_auth: any, callback: any) => {
  if (typeof callback === "function") callback(null);
  return () => {};
};
export const updateProfile = async (..._args: any[]) => {};
export const sendEmailVerification = async (..._args: any[]) => {};
export const sendPasswordResetEmail = async (..._args: any[]) => {};
export const updatePassword = async (..._args: any[]) => {};

export async function seedDatabase(_initialCategories?: any[], _initialProducts?: any[]) {
  return;
}
