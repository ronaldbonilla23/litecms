import { NavLink } from 'react-router-dom';

export function Sidebar() {
  return (
    <div className="w-24 flex items-center justify-center p-4">
      <aside className="w-16 bg-[#141414] border border-white/10 rounded-full flex flex-col items-center py-2 shadow-xl">
        <nav className="flex flex-col gap-6">
          <NavLink 
            to="/dashboard" 
            end
            className={({ isActive }) => 
              `w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-white hover:text-primary hover:bg-white/5'}`
            }
          >
            <i className="fi fi-rr-apps text-xl mt-1"></i>
          </NavLink>
          
          <button className="w-12 h-12 flex items-center justify-center rounded-full text-white hover:text-primary hover:bg-white/5 transition-all">
            <i className="fi fi-rr-document text-xl mt-1"></i>
          </button>
          
          <NavLink 
            to="/dashboard/media" 
            className={({ isActive }) => 
              `w-12 h-12 flex items-center justify-center rounded-full transition-all ${isActive ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-white hover:text-primary hover:bg-white/5'}`
            }
          >
            <i className="fi fi-rr-picture text-xl mt-1"></i>
          </NavLink>
        </nav>
        <div className="mt-auto">
          <button className="w-12 h-12 flex items-center justify-center rounded-full text-white/60 hover:text-red-400 transition-all">
            <i className="fi fi-rr-exit text-xl mt-1 ml-1"></i>
          </button>
        </div>
      </aside>
    </div>
  );
}
