import { Activity, Home, Clock, LogOut } from "lucide-react";

type NavPage = "dashboard" | "history";

interface SidebarProps {
  activePage: NavPage;
  setActivePage: (page: NavPage) => void;
  onLogout?: () => void;
}

export function Sidebar({ activePage, setActivePage, onLogout }: SidebarProps) {
  const itemClass = (page: NavPage) =>
    `p-3 rounded-xl transition-colors ${
      activePage === page
        ? "bg-[#1f2130] text-indigo-400"
        : "text-gray-400 hover:bg-[#1f2130] hover:text-white"
    }`;

  return (
    <aside className="w-16 h-screen bg-[#111218] border-r border-[#262837] flex flex-col items-center py-6 fixed left-0 top-0">
      <div className="mb-10 text-indigo-400">
        <Activity size={24} />
      </div>

      <nav className="flex flex-col gap-4">
        <button
          onClick={() => setActivePage("dashboard")}
          className={itemClass("dashboard")}
          title="Dashboard"
        >
          <Home size={20} />
        </button>

        <button
          onClick={() => setActivePage("history")}
          className={itemClass("history")}
          title="Analysis History"
        >
          <Clock size={20} />
        </button>
      </nav>

      {onLogout && (
        <button
          onClick={onLogout}
          className="mt-auto p-3 rounded-xl text-gray-400 hover:bg-[#1f2130] hover:text-red-400 transition-colors"
          title="Log out"
        >
          <LogOut size={20} />
        </button>
      )}
    </aside>
  );
}