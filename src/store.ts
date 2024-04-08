import { create } from "zustand";
import { Timings } from "./pages/Editor/types";

type State = {
  videoId: string;
  setVideoId: (videoId: string) => void;
  currentTimings: Timings[];
  setCurrentTimings: (timings: Timings[]) => void;
};

export const useStore = create<State>((set) => ({
  videoId: "",
  setVideoId: (videoId: string) => set({ videoId }),
  currentTimings: [
    {
      start: 0,
      end: 0,
    },
  ],
  setCurrentTimings: (currentTimings: Timings[]) => set({ currentTimings }),
}));
