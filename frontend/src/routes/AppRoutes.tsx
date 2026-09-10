import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { HomePage } from '../pages/HomePage';
import { SearchPage } from '../pages/SearchPage';
import { LibraryPage } from '../pages/LibraryPage';
import { PlaylistPage } from '../pages/PlaylistPage';
import { TrackDetailPage } from '../pages/TrackDetailPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { HistoryPage } from '../pages/HistoryPage';
import { AdminPage } from '../pages/AdminPage';
import { RoomsPage } from '../pages/RoomsPage';
import { RoomSessionPage } from '../pages/RoomSessionPage';
import { LocalMusicPage } from '../pages/LocalMusicPage';
import { DownloadAppPage } from '../pages/DownloadAppPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="local" element={<LocalMusicPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="room/:code" element={<RoomSessionPage />} />
        <Route path="download" element={<DownloadAppPage />} />
        <Route path="playlist/:id" element={<PlaylistPage />} />
        <Route path="track/:id" element={<TrackDetailPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
