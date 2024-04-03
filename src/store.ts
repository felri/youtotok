import { create } from "zustand";

type State = {
  videoId: string;
  setVideoId: (videoId: string) => void;
};

export const useStore = create<State>((set) => ({
  videoId: "",
  setVideoId: (videoId: string) => set({ videoId }),
}));
