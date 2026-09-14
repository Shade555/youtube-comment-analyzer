import { Activity, Home, Clock } from "lucide-react";

interface SidebarProps {
  activePage: "dashboard" | "history";
  setActivePage: (page: "dashboard" | "history") => void;
}

export function Sidebar({ activePage, setActivePage }: SidebarProps) {
  return (
    <aside className="w-16 h-screen bg-[#111218] border-r border-[#262837] flex flex-col items-center py-6 fixed left-0 top-0">
      <div className="mb-10 text-indigo-400">
        <Activity size={24} />
      </div>
      
      <nav className="flex flex-col gap-4">
        <button 
          onClick={() => setActivePage("dashboard")}
          className={`p-3 rounded-xl transition-colors ${
            activePage === "dashboard" 
              ? "bg-[#1f2130] text-indigo-400" 
              : "text-gray-400 hover:bg-[#1f2130] hover:text-white"
          }`}
        >
          <Home size={20} />
        </button>
        
        <button 
          onClick={() => setActivePage("history")}
          className={`p-3 rounded-xl transition-colors ${
            activePage === "history" 
              ? "bg-[#1f2130] text-indigo-400" 
              : "text-gray-400 hover:bg-[#1f2130] hover:text-white"
          }`}
        >
          <Clock size={20} />
        </button>
      </nav>
    </aside>
  );
}
