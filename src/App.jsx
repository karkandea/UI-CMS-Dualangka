import './App.css'
import Sidebar from './component/Sidebar'
import { Outlet } from 'react-router-dom'

function App() {
  return (
    <div className="flex bg-[#F8FAFC] min-h-screen w-full text-slate-900 font-sans">
      <Sidebar />
      <main className="flex-1 sm:ml-64 w-full h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full p-6 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default App
