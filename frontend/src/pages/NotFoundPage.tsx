import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-zinc-850 border border-zinc-700/60 flex items-center justify-center text-zinc-300 p-4">
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <rect x="3" y="9" width="3" height="6" rx="1.5" fill="currentColor" />
          <rect x="8.5" y="4" width="3" height="16" rx="1.5" fill="currentColor" />
          <rect x="14" y="2" width="3" height="20" rx="1.5" fill="currentColor" />
          <rect x="19.5" y="7" width="3" height="10" rx="1.5" fill="currentColor" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white tracking-tight font-heading">Page Not Found</h2>
      <p className="text-xs text-zinc-400 max-w-sm">
        The track, playlist, or page you're looking for doesn't exist or has moved.
      </p>
      <Button variant="primary" size="md" onClick={() => navigate('/')}>
        Return to Home Feed
      </Button>
    </div>
  );
};
