import React from 'react';
import { useNavigate } from 'react-router-dom';

interface GenreCardProps {
  title: string;
  color?: string;
  query?: string;
  image?: string;
}

export const GenreCard: React.FC<GenreCardProps> = ({
  title,
  color = 'from-violet-600 to-indigo-900',
  query,
  image,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/search?q=${encodeURIComponent(query || title)}`);
  };

  return (
    <div
      onClick={handleClick}
      className="relative h-24 md:h-28 rounded-2xl overflow-hidden p-4 bg-zinc-900/50 hover:bg-zinc-850/80 border border-white/[0.06] hover:border-white/[0.12] cursor-pointer group transition-all duration-200 flex flex-col justify-end"
    >
      <h3 className="text-sm md:text-base font-semibold text-white tracking-tight z-10 relative">
        {title}
      </h3>
    </div>
  );
};
