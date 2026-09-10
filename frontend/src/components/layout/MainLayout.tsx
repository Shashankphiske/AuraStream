import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { GlobalPlayer } from '../player/GlobalPlayer';
import { QueueDrawer } from '../player/QueueDrawer';
import { LyricsDrawer } from '../player/LyricsDrawer';
import { YouTubePlayerBridge } from '../player/YouTubePlayerBridge';
import { AuthModal } from '../../features/auth/AuthModal';
import { OnboardingInterestsModal } from '../../features/auth/OnboardingInterestsModal';
import { CreatePlaylistModal } from '../playlist/CreatePlaylistModal';
import { AddToPlaylistModal } from '../playlist/AddToPlaylistModal';
import { YouTubeComplianceModal } from '../common/YouTubeComplianceModal';
import { useAuthStore } from '../../store/useAuthStore';

export const MainLayout: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#07080e] text-slate-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto overscroll-y-contain pb-36 md:pb-28 px-4 md:px-8 py-6">
          <Outlet />
        </main>
      </div>

      {/* Persistent Audio/Video Engines */}
      <YouTubePlayerBridge />
      <GlobalPlayer />
      <QueueDrawer />
      <LyricsDrawer />

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Global Modals */}
      <AuthModal />
      <OnboardingInterestsModal />
      <CreatePlaylistModal />
      <AddToPlaylistModal />
      <YouTubeComplianceModal />
    </div>
  );
};
