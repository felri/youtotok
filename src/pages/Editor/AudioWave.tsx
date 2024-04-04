import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  src: string;
  isVideo?: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  src,
  isVideo = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const windowWidth = window.innerWidth - 20;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audioContext = new AudioContext();
    audioCtx.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;

    if (isVideo) {
      // Load the video and extract the audio track
      const video = document.createElement("video");
      video.src = src;
      video.crossOrigin = "anonymous";
      video.addEventListener("canplaythrough", () => {
        const mediaSource = audioContext.createMediaElementSource(video);
        mediaSourceRef.current = mediaSource;
        mediaSource.connect(analyser);
        analyser.connect(audioContext.destination);

        drawWaveform(analyser, ctx, canvas);
      });
    } else {
      // Load and decode the audio file
      const audio = new Audio(src);
      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      drawWaveform(analyser, ctx, canvas);
    }

    return () => {
      audioCtx.current?.close();
    };
  }, [src, isVideo]);

  return <canvas ref={canvasRef} width={windowWidth} height="70" />;
};

const drawWaveform = (
  analyser: AnalyserNode,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
) => {
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgb(0, 255, 0)";

    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  };

  draw();
};

export default AudioVisualizer;
