export type Timings = {
  start: number;
  end: number;
};

export interface EditorProps {
  videoUrl: string;
  trimVideo: (timings: Timings[]) => Promise<void>;
  loading: boolean;
}

export type GrabberProps = {
  deletingGrabber: boolean;
  currentWarning: string | null;
  currentlyGrabbed?: { index: number; type: string };
};
export interface SubtitlesTrackProps {
  kind: string;
  src: string;
  srcLang: string;
  default?: boolean;
  label: string;
}