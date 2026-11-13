import { initialState, type StoredState } from '../session/types';
import { migrateState } from './validate';

export const STORAGE_KEY = 'stay-awake:v1';
const MESSAGE = '无法可靠保存本地数据，已暂停开始功能。请允许此网站使用浏览器存储，然后刷新。';
export function readState(storage: Pick<Storage, 'getItem'> = localStorage): StoredState {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    throw new Error(MESSAGE);
  }
  if (raw === null) return initialState();
  try {
    const parsed: unknown = JSON.parse(raw);
    return migrateState(parsed);
  } catch {
    throw new Error(
      '本地记录格式异常，已暂停开始功能以保留使用记录。请先备份浏览器数据并排查问题。',
    );
  }
}
export function writeState(state: StoredState, storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error(MESSAGE);
  }
}

/** IndexedDB read/write transactions serialize the synchronous localStorage mutation
 * across tabs, including LAN HTTP where Web Locks are unavailable. */
let database: Promise<IDBDatabase> | undefined;
function openMutexDB(): Promise<IDBDatabase> {
  return (database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('stay-awake-coordination', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('mutex');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(MESSAGE));
    request.onblocked = () => reject(new Error('另一个页面阻止了存储初始化，请关闭旧页面后刷新。'));
  }));
}
export async function exclusive<T>(action: () => T): Promise<T> {
  if (navigator.locks) return navigator.locks.request('stay-awake-state', action);
  const db = await openMutexDB();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction('mutex', 'readwrite');
    const request = transaction.objectStore('mutex').get('lock');
    let result: T;
    let failure: unknown;
    request.onsuccess = () => {
      try {
        result = action();
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = transaction.onerror = () => reject(failure ?? new Error(MESSAGE));
  });
}
