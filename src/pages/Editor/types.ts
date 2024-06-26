export type SubtitleStyle = "words" | "segments" | "3words" | "4words" | "5words" | "6words" | "none";

export type Timings = {
  start: number;
  end: number;
};

export interface EditorProps {
  videoUrl: string;
  trimVideo: (timings: Timings[], dimensions?: Dimensions) => void;
  loading: boolean;
  videoId: string;
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

export interface Dimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DraggableData = {
  node: HTMLElement;
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  lastX: number;
  lastY: number;
};

export type DraggableEventHandler = (
  e: any,
  data: DraggableData
) => void | false;

export interface DownloadButtonProps {
  subtitlesExist: boolean;
  videoId: string;
  subtitleType: SubtitleStyle
  videoRef: React.RefObject<HTMLVideoElement>;
}

export interface SubtitleOptionsProps {
  type: SubtitleStyle;
  setType: (type: SubtitleStyle) => void;
  subtitlesExist: boolean;
}

export interface GenerateSubtitlesButtonProps {
  createSubtitles: () => void;
  loading: boolean;
  apiKey: string | null;
  subtitlesExist: boolean;
}

export interface ApiKeyComponentProps {
  apiKey: string | null;
  setApiKey: (apiKey: string) => void;
}

export interface VttTextAreaProps {
  type: SubtitleStyle;
  reloadVideo: () => void;
}

export interface CueVtt {
  color: string;
  fontWeight: string;
  outlinecolor: string;
  fontFamily: string;
  textShadow: string;
  fontSize: string;
}

export interface LanguageSelectProps {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
}
