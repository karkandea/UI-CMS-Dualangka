// src/lib/uploadArticleCover.js
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../firebase';

export async function uploadArticleCover(slug, file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `articles/${slug}.${ext}`;
  const objectRef = ref(storage, path);
  const snap = await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(snap.ref);
}
