import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../../firebase.js";
import { signOut } from "firebase/auth";

const Sidebar = () => {
  const [openWorkDropdown, setOpenWorkDropdown] = useState(false);
  const [openArticleDropdown, setOpenArticleDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Auto-open dropdowns if child route is active
    if (location.pathname.startsWith('/work')) setOpenWorkDropdown(true);
    if (location.pathname.startsWith('/articles')) setOpenArticleDropdown(true);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/admin/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Gagal logout, coba lagi.");
    }
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const navItemBase = "flex items-center w-full p-2.5 rounded-xl font-medium transition-all duration-200 group";
  const navItemIdle = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
  const navItemActive = "text-blue-700 bg-blue-50/70 shadow-sm";

  return (
    <>
      <button
        data-drawer-target="default-sidebar"
        data-drawer-toggle="default-sidebar"
        aria-controls="default-sidebar"
        type="button"
        className="inline-flex items-center p-2 mt-2 ms-3 text-sm rounded-lg sm:hidden hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        <span className="sr-only">Open sidebar</span>
        <Icon icon="mdi:menu" className="text-2xl" />
      </button>

      <aside
        id="default-sidebar"
        className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0 border-r border-slate-200 bg-white"
        aria-label="Sidebar"
      >
        <div className="h-full px-4 flex flex-col pt-6 pb-4 overflow-y-auto">
          {/* Logo / Brand */}
          <div className="flex items-center px-2 mb-8 select-none tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center mr-3 shadow-sm">
              <Icon icon="solar:d-bold" className="text-white text-xl" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Dualangka
            </span>
            <span className="ml-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">CMS</span>
          </div>

          <ul className="space-y-1.5 flex-1">
            {/* Dashboard */}
            <li>
              <Link
                to="/"
                className={`${navItemBase} ${location.pathname === '/' ? navItemActive : navItemIdle}`}
              >
                <Icon icon="solar:home-smile-bold-duotone" className="text-2xl mr-3 opacity-80" />
                <span>Dashboard</span>
              </Link>
            </li>

            <li className="pt-4 pb-1">
              <span className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-widest content-none">Content</span>
            </li>

            {/* Works */}
            <li>
              <button
                onClick={() => setOpenWorkDropdown(!openWorkDropdown)}
                className={`${navItemBase} ${isActive('/work') && !openWorkDropdown ? 'text-slate-900 bg-slate-50' : navItemIdle}`}
              >
                <Icon icon="solar:folder-with-files-bold-duotone" className="text-2xl mr-3 opacity-80" />
                <span className="flex-1 text-left">Works</span>
                <Icon
                  icon="mdi:chevron-down"
                  className={`text-xl transition-transform duration-300 opacity-60 ${openWorkDropdown ? "rotate-180" : ""}`}
                />
              </button>

              <ul className={`overflow-hidden transition-all duration-300 ease-in-out ${openWorkDropdown ? "max-h-40 mt-1 opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="ml-5 pl-4 border-l-2 border-slate-100 flex flex-col space-y-1 py-1">
                  <li>
                    <Link
                      to="/work/add"
                      className={`block py-2 px-3 text-sm rounded-lg transition-colors ${location.pathname === '/work/add' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Add New Work
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/work/manage"
                      className={`block py-2 px-3 text-sm rounded-lg transition-colors ${location.pathname === '/work/manage' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Manage Works
                    </Link>
                  </li>
                </div>
              </ul>
            </li>

            {/* Articles */}
            <li>
              <button
                onClick={() => setOpenArticleDropdown(!openArticleDropdown)}
                className={`${navItemBase} ${isActive('/articles') && !openArticleDropdown ? 'text-slate-900 bg-slate-50' : navItemIdle}`}
              >
                <Icon icon="solar:document-text-bold-duotone" className="text-2xl mr-3 opacity-80" />
                <span className="flex-1 text-left">Articles</span>
                <Icon
                  icon="mdi:chevron-down"
                  className={`text-xl transition-transform duration-300 opacity-60 ${openArticleDropdown ? "rotate-180" : ""}`}
                />
              </button>

              <ul className={`overflow-hidden transition-all duration-300 ease-in-out ${openArticleDropdown ? "max-h-40 mt-1 opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="ml-5 pl-4 border-l-2 border-slate-100 flex flex-col space-y-1 py-1">
                  <li>
                    <Link
                      to="/articles/add"
                      className={`block py-2 px-3 text-sm rounded-lg transition-colors ${location.pathname === '/articles/add' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Add New Article
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/articles/manage"
                      className={`block py-2 px-3 text-sm rounded-lg transition-colors ${location.pathname === '/articles/manage' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Manage Articles
                    </Link>
                  </li>
                </div>
              </ul>
            </li>
          </ul>

          <div className="mt-8">
            <button
              onClick={handleLogout}
              className="group flex w-full items-center gap-3 rounded-xl p-3 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <div className="flex h-8 w-8 justify-center items-center rounded-lg bg-slate-100 group-hover:bg-red-100 transition-colors">
                <Icon icon="solar:logout-2-bold-duotone" className="text-xl opacity-80" />
              </div>
              <span className="flex-1 text-left">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
