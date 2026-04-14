// utils/db.js
import { openDB } from 'idb';

export const dbPromise = openDB('video-store', 1, {
  upgrade(db) {
    db.createObjectStore('videos');
  },
});