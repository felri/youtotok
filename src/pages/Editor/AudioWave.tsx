import { useCallback, useRef, useMemo } from "react";
import { WaveSurfer, WaveForm } from "wavesurfer-react";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";

interface AudioWaveProps {
  videoId: string;
}

function AudioWave({ videoId }: AudioWaveProps) {
  const plugins = useMemo(() => {
    return [
      {
        key: "top-timeline",
        plugin: TimelinePlugin,
        options: {
          height: 20,
          insertPosition: "beforebegin",
          style: {
            color: "#ccc",
          },
        },
      },
    ].filter(Boolean);
  }, []);

  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const handleWSMount = useCallback((waveSurfer: WaveSurfer) => {
    wavesurferRef.current = waveSurfer;

    if (wavesurferRef.current) {
      wavesurferRef.current.load(`/${videoId}_full.mp3`);

      if (window) {
        // @ts-ignore
        window.surferidze = wavesurferRef.current;
      }
    }
  }, []);

  const play = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 z-20">
      <div className="relative h-full -mt-7">
        <WaveSurfer
          // @ts-ignore
          plugins={plugins}
          // @ts-ignore
          onMount={handleWSMount}
          cursorColor="transparent"
          container="#waveform"
        >
          <WaveForm id="waveform"></WaveForm>
          <div id="timeline" />
        </WaveSurfer>
      </div>
    </div>
  );
}

export default AudioWave;
