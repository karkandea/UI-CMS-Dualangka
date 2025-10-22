import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom'
import {auth} from '../firebase.js'
import App from './App'
import AdminLogin from './pages/AdminLogin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Work from './pages/Work'
import ManageWork from './pages/ManageWork'
import AddNewWork from './pages/AddNewWork'
import NotFoundPage from './pages/NotFoundPage'
import EditWork from './pages/EditWork.jsx';
import AddArticle from './pages/AddArticle.jsx'
import { Outlet } from 'react-router-dom'
import ManageArticles from './pages/ManageArticles.jsx'
import EditArticle from './pages/EditArticle.jsx'

// ⬇️ bikin/letakkan di: src/component/ProtectedRoute.jsx
import ProtectedRoute from './component/ProtectedRoute.jsx'

if (import.meta.env.DEV) {
  window.getFirebaseToken = async () => {
    const u = auth.currentUser;
    if (!u) throw new Error('Belum login!');
    const t = await u.getIdToken(true);
    console.log('TOKEN:', t);
    return t;
  };
}

const router = createBrowserRouter([
  { path: 'admin/login', element: <AdminLogin /> },
  {
    path: '/',
    element: <App />, // layout (Sidebar + <Outlet />)
    children: [
      { 
        index: true, 
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )
      },
      {
        path: 'work',
        element: (
          <ProtectedRoute>
            <Work /> {/* layout Works (punya <Outlet />) */}
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <AddNewWork /> },     // /work
          { path: 'add', element: <AddNewWork /> },     // /work/add
          { path: 'manage', element: <ManageWork /> },  // /work/manage
          {path: 'edit/:slug', element: <EditWork />},
        ],
      },

        {
    path: 'articles',
    element: (
      <ProtectedRoute>
        <div className="p-4"><Outlet /></div>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ManageArticles /> },
      { path: 'add', element: <AddArticle /> },
      { path: 'manage', element: <ManageArticles /> },
      { path: 'edit/:slug', element: <EditArticle /> },
    ],
  },

      { path: '*', element: <NotFoundPage /> },
    ],
  },


  
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
