import React from 'react';
import { Modal } from './Modal';
import { useUIStore } from '../../store/useUIStore';
import { ExternalLink, ShieldCheck, Video, Info } from 'lucide-react';

export const YouTubeComplianceModal: React.FC = () => {
  const { activeModal, closeModal } = useUIStore();
  const isOpen = activeModal === 'compliance';

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      maxWidth="md"
      title="YouTube API Terms & Compliance"
    >
      <div className="space-y-4 text-xs text-zinc-300 leading-relaxed select-text">
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start gap-3">
          <Info className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
          <p className="text-zinc-300">
            AuraStream uses official <strong>YouTube API Services</strong> (via YouTube IFrame Player API) to deliver audiovisual streams directly from YouTube creators and artists.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-white text-sm">Terms of Service & Privacy</h4>
          <p className="text-zinc-400">
            By using AuraStream to play, discover, or watch music and video content, you agree to be bound by the official policies:
          </p>
          <div className="space-y-1.5 pt-1">
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-red-500" />
                <span className="font-medium">YouTube Terms of Service</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </a>

            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="font-medium">Google Privacy Policy</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </a>

            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Google Security & Connected Accounts</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </a>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
          <p>
            <strong>Audiovisual Content Rights:</strong> All videos, audio tracks, artist metadata, and cover art are property of their respective creators and copyright holders on YouTube. AuraStream does not host, download, or alter video files.
          </p>
          <p>
            <strong>Embedding Restrictions:</strong> Certain music publishers restrict external embedding. In such instances, direct links are provided to watch on the official YouTube platform.
          </p>
        </div>
      </div>
    </Modal>
  );
};
