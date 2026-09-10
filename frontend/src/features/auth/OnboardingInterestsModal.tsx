import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { GENRE_ITEMS } from '../../constants';
import { Check, SlidersHorizontal } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export const OnboardingInterestsModal: React.FC = () => {
  const { activeModal, closeModal } = useUIStore();
  const { user, updateInterests } = useAuthStore();
  const queryClient = useQueryClient();

  const isOpen = activeModal === 'onboarding';

  const [selected, setSelected] = useState<string[]>(user?.interests || ['Electronic', 'Lo-Fi', 'Pop']);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const toggleGenre = (genre: string) => {
    if (selected.includes(genre)) {
      if (selected.length > 1) {
        setSelected(selected.filter((g) => g !== genre));
      }
    } else {
      setSelected([...selected, genre]);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateInterests(selected);
      // Invalidate home feed query so personalized mixes refresh immediately!
      queryClient.invalidateQueries({ queryKey: ['home-feed'] });
      closeModal();
    } catch (err) {
      console.error('Failed to save interests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      maxWidth="lg"
      title="Music Preferences"
    >
      <div className="space-y-4">
        <p className="text-xs text-zinc-400">
          Select genres you enjoy. We tailor your daily mixes, discover feeds, and recommendations to match your taste.
        </p>

        {/* Genre Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1 py-1">
          {GENRE_ITEMS.map((genre) => {
            const isPicked = selected.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  isPicked
                    ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <span>{genre}</span>
                {isPicked && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <span className="text-xs text-zinc-500 font-mono">
            {selected.length} genre{selected.length !== 1 ? 's' : ''} selected
          </span>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isLoading}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Save Preferences</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
