import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store";
import { useLocation } from "wouter";
import DirectionalButtons from "../components/DirectionalButtons";

function SubtitlesPage() {
  const { videoId } = useStore();
  const [_, setLocation] = useLocation();
  const [apiKey, setApiKey] = useState<string | null>(
    localStorage.getItem("openAiApiKey")
  );
  const [loading, setLoading] = useState(false);
  const [subtitlesExist, setSubtitlesExist] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // subtitle position
  const [lineValue, setLineValue] = useState<number>(10);
  const [positionValue, setPositionValue] = useState<number>(50);
  const [fontSizeValue, setFontSizeValue] = useState<number>(10);
  const [fontColorValue, setFontColorValue] = useState<string>("#ffffff");

  useEffect(() => {
    if (!videoId) {
      setLocation("/");
    }
  }, []);

  useEffect(() => {
    const storedApiKey = localStorage.getItem("openAiApiKey");
    console.log(storedApiKey);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    checkSubtitles();
  }, [videoId]);

  useEffect(() => {
    // Save the API key to localStorage whenever it changes
    if (!apiKey) return;
    localStorage.setItem("openAiApiKey", apiKey);
  }, [apiKey]);

  async function checkSubtitles() {
    if (subtitlesExist) return;
    const response = await invoke<boolean>("check_subtitles", {
      videoId,
    });
    setSubtitlesExist(response);
  }

  async function createSubtitles() {
    setLoading(true);
    await invoke<string>("transcribe_audio", {
      apiKey,
      videoId,
    });
    setLoading(false);
    checkSubtitles();
  }

  function handleSubtitleButtonClick(type: "words" | "segments" | "none") {
    const video = videoRef.current;
    if (!video) return;

    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (track.label === type) {
        track.mode = "showing";
      } else {
        track.mode = "hidden";
      }
    }
  }

  // subtitle position --------------------------------
  function moveLine(direction: "up" | "down") {
    const video = videoRef.current;
    if (!video) return;

    Array.from(video.textTracks).forEach((track) => {
      if (track.mode === "showing") {
        if (!track.cues) return;
        Array.from(track.cues).forEach((cue) => {
          const line = (cue as any).line;
          if (isFinite(line)) {
            const newLine = Math.max(
              0,
              Math.min(10, line + (direction === "up" ? -1 : 1))
            );
            (cue as any).line = newLine;
            setLineValue(newLine);
          } else {
            (cue as any).line = 10;
            setLineValue(10);
          }
        });
      }
    });
  }

  function moveSide(direction: "left" | "right") {
    const video = videoRef.current;
    if (!video) return;

    Array.from(video.textTracks).forEach((track) => {
      if (track.mode === "showing") {
        if (!track.cues) return;
        Array.from(track.cues).forEach((cue) => {
          const position = (cue as any).position;
          if (isFinite(position)) {
            const newPosition = Math.max(
              0,
              Math.min(100, position + (direction === "left" ? -5 : 5))
            );
            (cue as any).position = newPosition;
            setPositionValue(newPosition);
          } else {
            (cue as any).position = 50;
            setPositionValue(50);
          }
        });
      }
    });
  }

  function changeFontSize(type: "increase" | "decrease") {
    const video = videoRef.current;
    if (!video) return;

    Array.from(video.textTracks).forEach((track) => {
      if (track.mode === "showing") {
        if (!track.cues) return;
        Array.from(track.cues).forEach((cue) => {
          const fontSize = (cue as any).fontSize;
          if (isFinite(fontSize)) {
            const newFontSize = Math.max(
              0,
              Math.min(100, fontSize + (type === "increase" ? 5 : -5))
            );
            (cue as any).fontSize = newFontSize;
            setFontSizeValue(newFontSize);
          } else {
            (cue as any).fontSize = 10;
            setFontSizeValue(10);
          }
        });
      }
    });
  }

  function changeFontColor(color: string) {
    const video = videoRef.current;
    if (!video) return;

    Array.from(video.textTracks).forEach((track) => {
      if (track.mode === "showing") {
        if (!track.cues) return;
        Array.from(track.cues).forEach((cue) => {
          (cue as any).color = color;
          setFontColorValue(color);
        });
      }
    });
  }

  // setFontSize (fontSize) {
  // 	const css = document.createElement('style');
  // 	css.type = 'text/css';
  // 	css.innerHTML = `::cue { font-size: ${fontSize}px; }`;
  // 	document.body.appendChild(css);
  // },
  // setFontColor (fontColor) {
  // 	const css = document.createElement('style');
  // 	css.type = 'text/css';
  // 	css.innerHTML = `::cue { color: ${fontColor}; }`;
  // 	document.body.appendChild(css);
  // },

  // end of subtitle position -------------------------

  return (
    <div className="container">
      <div className="flex flex-col items-center justify-center space-y-4 m-4">
        <label htmlFor="greet-input">Enter your OpenAI key</label>
        <p className="text-sm text-gray-500">
          You can find your OpenAI key in the{" "}
          <a
            href="https://platform.openai.com/account/api-keys"
            className="text-blue-500"
            target="_blank"
            rel="noreferrer"
          >
            OpenAI dashboard
          </a>
        </p>
        <input
          id="greet-input"
          className="p-2 border border-gray-300 rounded-md w-80"
          value={apiKey || ""}
          onChange={(e) => setApiKey(e.currentTarget.value)}
          placeholder="Enter your OpenAI key..."
        />
      </div>
      <div className="flex justify-start my-4 max-w-[70%] mx-auto">
        {!subtitlesExist ? (
          <button
            className="bg-blue-500 text-white p-2 rounded-md w-80"
            onClick={createSubtitles}
            disabled={loading || !apiKey}
          >
            {loading
              ? "Loading..."
              : apiKey
              ? "Create Subtitles"
              : "Enter API Key"}
          </button>
        ) : (
          <p className="text-green-500">Subtitles exist for this video</p>
        )}
      </div>
      <div className="flex justify-center flex-col">
        <video
          id="video"
          loop
          controls
          preload="metadata"
          ref={videoRef}
          className="w-[70vw] mx-auto"
        >
          <source src={`./${videoId}_trimmed.mp4`} type="video/mp4" />
          {subtitlesExist && (
            <>
              <track
                label="words"
                kind="subtitles"
                srcLang="en"
                src={`./${videoId}_words.vtt`}
              />
              <track
                label="segments"
                kind="subtitles"
                srcLang="en"
                src={`./${videoId}.vtt`}
              />
            </>
          )}
        </video>
        <div>
          {subtitlesExist && (
            <div className="flex justify-center items-center space-x-4 pt-4">
              <h2>Subtitles</h2>
              <button
                className="bg-green-900 text-white p-2 rounded-md w-30"
                onClick={() => handleSubtitleButtonClick("words")}
              >
                Words
              </button>
              <button
                className="bg-green-900 text-white p-2 rounded-md w-30"
                onClick={() => handleSubtitleButtonClick("segments")}
              >
                Segments
              </button>
              <button
                className="bg-green-900 text-white p-2 rounded-md w-30"
                onClick={() => handleSubtitleButtonClick("none")}
              >
                Hide
              </button>
              <DirectionalButtons moveLine={moveLine} moveSide={moveSide} />  
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubtitlesPage;
