export type Timings = {
  start: number;
  end: number;
};

export interface EditorProps {
  videoUrl: string;
  trimVideo: (timings: Timings[]) => Promise<void>;
}

export type GrabberProps = {
  deletingGrabber: boolean;
  currentWarning: string | null;
  currentlyGrabbed?: { index: number; type: string };
};
