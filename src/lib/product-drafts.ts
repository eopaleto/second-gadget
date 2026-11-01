import type { ProductInput } from './validation'
import type { ProductImage } from '../types'
export type ProductDraft = {
  values: ProductInput
  images: ProductImage[]
  files: File[]
  manualModel: boolean
}
// IndexedDB preserves selected File objects, unlike local/sessionStorage.
const pending = new Map<string, Promise<unknown>>()
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('second-device-drafts', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('products')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
function enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const next = (pending.get(key) || Promise.resolve()).catch(() => {}).then(operation)
  pending.set(key, next)
  void next
    .finally(() => {
      if (pending.get(key) === next) pending.delete(key)
    })
    .catch(() => {})
  return next
}
function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return database().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction('products', mode)
        const request = operation(tx.objectStore('products'))
        tx.oncomplete = () => {
          db.close()
          resolve(request.result)
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
        tx.onabort = () => {
          db.close()
          reject(tx.error)
        }
      }),
  )
}
export function readProductDraft(key: string): Promise<ProductDraft | undefined> {
  return enqueue(key, () => transaction('readonly', (store) => store.get(key)))
}
export function writeProductDraft(key: string, draft: ProductDraft) {
  return enqueue(key, () => transaction('readwrite', (store) => store.put(draft, key)))
}
export function clearProductDraft(key: string) {
  return enqueue(key, () => transaction('readwrite', (store) => store.delete(key)))
}
