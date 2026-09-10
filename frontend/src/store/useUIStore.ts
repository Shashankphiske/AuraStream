import { create } from 'zustand';
import { ITrack } from '../types';

export type ModalType = 'login' | 'register' | 'onboarding' | 'createPlaylist' | 'addToPlaylist' | 'compliance' | null;

interface UIState {
  activeModal: ModalType;
  selectedTrackForPlaylist: ITrack | null;
  openModal: (type: ModalType, track?: ITrack) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  selectedTrackForPlaylist: null,
  openModal: (type, track) => set({ activeModal: type, selectedTrackForPlaylist: track || null }),
  closeModal: () => set({ activeModal: null, selectedTrackForPlaylist: null }),
}));
