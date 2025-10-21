import './App.css'
import Sidebar from './component/Sidebar'
import { Outlet } from 'react-router-dom'
// import { getAuth } from "firebase/auth";
// import { useEffect } from 'react';



function App() {
  /*
  useEffect(() => {
  const auth = getAuth();
  auth.currentUser?.getIdToken(true).then((token) => {
    console.log("🔥 FIREBASE TOKEN:", token);
  });
}, []);
*/
  return (
    <>
    <div className='flex'>
      <Sidebar />
      <main className="flex-1 p-6 sm:ml-64 bg-gray-50 min-h-screen">
        <Outlet />
      </main>
    </div>
    </>

  )
}

export default App
