const DB_NAME = 'fetife-offline'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' })
      }
    }
    request.onsuccess = e => resolve(e.target.result)
    request.onerror = e => reject(e.target.error)
  })
}

export async function savePending(table, data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readwrite')
    tx.objectStore('pending').add({ table, data, createdAt: new Date().toISOString() })
    tx.oncomplete = resolve
    tx.onerror = e => reject(e.target.error)
  })
}

export async function addPending(table, data) {
  return savePending(table, data)
}

export async function getPending() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readonly')
    const request = tx.objectStore('pending').getAll()
    request.onsuccess = e => resolve(e.target.result)
    request.onerror = e => reject(e.target.error)
  })
}

export async function clearPending(ids) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readwrite')
    const store = tx.objectStore('pending')
    ids.forEach(id => store.delete(id))
    tx.oncomplete = resolve
    tx.onerror = e => reject(e.target.error)
  })
}

export async function saveDashboardCache(data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    tx.objectStore('cache').put({ key: 'dashboard', data, updatedAt: new Date().toISOString() })
    tx.oncomplete = resolve
    tx.onerror = e => reject(e.target.error)
  })
}

export async function getDashboardCache() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readonly')
    const request = tx.objectStore('cache').get('dashboard')
    request.onsuccess = e => resolve(e.target.result?.data || null)
    request.onerror = e => reject(e.target.error)
  })
}

export async function saveVenteOffline(data) {
  return savePending('ventes', data)
}

export async function saveAchatOffline(data) {
  return savePending('achats', data)
}

export async function saveDepenseOffline(data) {
  return savePending('depenses', data)
}

export async function saveDettesOffline(data) {
  return savePending('dettes', data)
}

export async function getPendingForUser(userId) {
  const all = await getPending()
  return all.filter(item => !item.data.user_id || item.data.user_id === userId)
}

export async function syncPendingToSupabase(supabase, userId) {
  const pending = await getPendingForUser(userId)
  if (pending.length === 0) return
  const ids = []
  for (const item of pending) {
    try {
      await supabase.from(item.table).insert(item.data)
      ids.push(item.id)
    } catch (e) {
      console.error('Sync erreur:', e)
    }
  }
  if (ids.length > 0) await clearPending(ids)
}

export async function syncPendingWithSupabase(supabase, userId) {
  return syncPendingToSupabase(supabase, userId)
}