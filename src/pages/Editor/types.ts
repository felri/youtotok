export type Timings = {
  start: number;
  end: number;
};

export interface EditorProps {
  videoUrl: string;
  timings: { start: number; end: number }[];
  setTimings: (timings: Timings[]) => void;
}

export type GrabberProps = {
  deletingGrabber: boolean;
  currentWarning: string | null;
  currentlyGrabbed?: { index: number; type: string };
};
