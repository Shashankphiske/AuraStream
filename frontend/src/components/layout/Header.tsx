import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  LogOut,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  Smartphone,
  Download,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../common/Button';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { openModal } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSearchPage = location.pathname.startsWith('/search');

  // Sync search input with URL search param
  useEffect(() => {
    if (isSearchPage) {
      const params = new URLSearchParams(location.search);
      setSearchQuery(params.get('q') || '');
    }
  }, [location.search, isSearchPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-850 px-3 sm:px-6 py-2.5 md:py-0 md:h-16 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-4 transition-all">
      {/* 1. Top Row on Mobile / Left on Desktop: Navigation & Search Bar */}
      <div className="flex items-center gap-2 sm:gap-4 w-full md:w-auto flex-1 md:max-w-xl">
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            aria-label="Forward"
            className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (isSearchPage) {
                navigate(val.trim() ? `/search?q=${encodeURIComponent(val.trim())}` : '/search', { replace: true });
              }
            }}
            onFocus={() => {
              if (!isSearchPage) {
                navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : '/search');
              }
            }}
            placeholder="Search songs, artists, albums..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-all"
          />
        </form>
      </div>

      {/* 2. Below Search Bar on Mobile / Right on Desktop: APK, Sign In, Sign Up */}
      <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto pt-1 md:pt-0 border-t border-zinc-850/60 md:border-t-0">
        {/* Quick App Download Link */}
        <button
          onClick={() => navigate('/download')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer hover:scale-105"
          title="Download AuraStream for Android"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Get App</span>
          <span className="text-[10px] bg-emerald-500/30 px-1 py-0.2 rounded text-emerald-200">APK</span>
        </button>

        {isAuthenticated && user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-white text-black flex items-center justify-center text-xs font-bold">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-xs font-medium text-zinc-200 max-w-[110px] sm:max-w-[130px] truncate">
                {user.name}
              </span>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-zinc-800 mb-1">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                </div>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/download');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 transition-colors text-left cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Download Android APK</span>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    openModal('onboarding');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
                  <span>Music Preferences</span>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    openModal('compliance');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-zinc-400" />
                  <span>YouTube Policies & Terms</span>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal('compliance')}
              title="YouTube API Policies & Terms"
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openModal('login')}
              className="text-xs px-3 py-1.5"
            >
              Sign In
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => openModal('register')}
              className="text-xs px-3.5 py-1.5"
            >
              Sign Up
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
