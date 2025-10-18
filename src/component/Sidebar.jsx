// Sidebar.jsx (versi rapi & fix)
import { Icon } from "@iconify/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../../firebase.js";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const [openWorkDropdown, setOpenWorkDropdown] = useState(false);
  const [openArticleDropdown, setOpenArticleDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/admin/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Gagal logout, coba lagi.");
    }
  };

  return (
    <div>
      <button
        data-drawer-target="default-sidebar"
        data-drawer-toggle="default-sidebar"
        aria-controls="default-sidebar"
        type="button"
        className="inline-flex items-center p-2 mt-2 ms-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
      >
        <span className="sr-only">Open sidebar</span>
      </button>

      <aside
        id="default-sidebar"
        className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0"
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800 flex flex-col">
          <ul className="space-y-2 font-medium">
            {/* Dashboard */}
            <li>
              <Link
                to="/"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                <Icon icon="duo-icons:dashboard" className="text-2xl" />
                <span className="ms-3">Dashboard</span>
              </Link>
            </li>

            {/* Works (dropdown) */}
            <li>
              <button
                onClick={() => setOpenWorkDropdown(!openWorkDropdown)}
                className="flex items-center w-full p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Icon icon="solar:document-bold-duotone" className="text-2xl" />
                <span className="flex-1 ms-3 text-left whitespace-nowrap">Works</span>
                <Icon
                  icon={openWorkDropdown ? "mdi:chevron-up" : "mdi:chevron-down"}
                  className="text-xl transition-transform duration-200"
                />
              </button>

              <ul
                className={`pl-11 overflow-hidden transition-all duration-300 ${
                  openWorkDropdown ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <li>
                  <Link
                    to="/work/add"
                    className="block py-2 text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600"
                  >
                    Add New Work
                  </Link>
                </li>
                <li>
                  <Link
                    to="/work/manage"
                    className="block py-2 text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600"
                  >
                    Manage Works
                  </Link>
                </li>
              </ul>
            </li>

            {/* Articles (dropdown) */}
            <li>
              <button
                onClick={() => setOpenArticleDropdown(!openArticleDropdown)}
                className="flex items-center w-full p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Icon icon="ph:newspaper-duotone" className="text-2xl" />
                <span className="flex-1 ms-3 text-left">Articles</span>
                <Icon
                  icon={openArticleDropdown ? "mdi:chevron-up" : "mdi:chevron-down"}
                  className="text-xl"
                />
              </button>

              <ul
                className={`pl-11 overflow-hidden transition-all duration-300 ${
                  openArticleDropdown ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <li>
                  <Link
                    to="/articles/add"
                    className="block py-2 text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600"
                  >
                    Add New Article
                  </Link>
                </li>
                <li>
                  <Link
                    to="/articles/manage"
                    className="block py-2 text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600"
                  >
                    Manage Articles
                  </Link>
                </li>
              </ul>
            </li>
          </ul>

          <button
            onClick={handleLogout}
            className="mt-auto flex items-center gap-2 w-full text-left text-red-600 hover:text-white hover:bg-red-600 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            <Icon icon="material-symbols:logout-rounded" className="text-lg" />
            Logout
          </button>
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;
