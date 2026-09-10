import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Radio, Library, Heart } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-1 py-1 px-2 text-[10px] font-medium transition-colors ${
      isActive ? 'text-white font-semibold' : 'text-zinc-500 hover:text-zinc-200'
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#09090b]/95 backdrop-blur-xl flex items-center justify-around px-1 border-t border-zinc-850">
      <NavLink to="/" end className={navItemClass}>
        <Home className="w-5 h-5" />
        <span>Home</span>
      </NavLink>
      <NavLink to="/search" className={navItemClass}>
        <Search className="w-5 h-5" />
        <span>Search</span>
      </NavLink>
      <NavLink to="/rooms" className={navItemClass}>
        <Radio className="w-5 h-5 text-rose-500" />
        <span>Rooms</span>
      </NavLink>
      <NavLink to="/library" className={navItemClass}>
        <Library className="w-5 h-5" />
        <span>Library</span>
      </NavLink>
      <NavLink to="/favorites" className={navItemClass}>
        <Heart className="w-5 h-5" />
        <span>Liked</span>
      </NavLink>
    </nav>
  );
};

