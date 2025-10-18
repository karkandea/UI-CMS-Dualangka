// ProtectedRoute.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function ProtectedRoute({ children }) {
  const [state, setState] = useState({ s: 'loading', r: '' });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return setState({ s: 'deny', r: 'NOT_LOGGED_IN' });
      try {
        const snap = await getDoc(doc(db, 'admins', user.uid));
        setState(snap.exists() ? { s: 'allow', r: '' } : { s: 'deny', r: 'NO_ADMIN_DOC' });
      } catch (e) {
        console.error('ADMIN_CHECK_ERROR', e);
        setState({ s: 'deny', r: 'ADMIN_CHECK_ERROR' });
      }
    });
    return () => unsub();
  }, []);

  if (state.s === 'loading') return <div className="p-6 text-gray-500">Checking access…</div>;
  if (state.s === 'deny') {
    console.warn('Access denied because:', state.r);
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
