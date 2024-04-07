import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../../store";
import { useLocation } from "wouter";
import VttTextArea from "./VttTextArea";

function SubtitlesPage() {
  const { videoId } = useStore();
  const [_, setLocation] = useLocation();
  const [apiKey, setApiKey] = useState<string | null>(
    localStorage.getItem("openAiApiKey")
  );
  const [loading, setLoading] = useState(false);
  const [subtitlesExist, setSubtitlesExist] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState(true);

  // subtitle
  const [subtitleType, setSubtitleType] = useState<
    "words" | "segments" | "none"
  >("none");

  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!videoId) {
      setLocation("/");
    }
  }, []);

  useEffect(() => {
    const storedApiKey = localStorage.getItem("openAiApiKey");
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
    if (subtitlesExist) {
      setSubtitleType("words");
      reloadVideo();
      return;
    }
    const response = await invoke<boolean>("check_subtitles", {
      videoId,
    });
    setSubtitlesExist(response);
    setSubtitleType("words");
    reloadVideo();
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

  async function enableSubtitle(type: "words" | "segments" | "none") {
    // sleep for a bit to allow the video to reload
    await new Promise((resolve) => setTimeout(resolve, 100));

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
    setSubtitleType(type);
  }

  function reloadVideo() {
    setShowVideo(false);
    setTimeout(() => {
      setShowVideo(true);
      enableSubtitle(subtitleType);
    }, 50);
  }

  async function downloadVideo() {
    if (downloading) return;
    setDownloading(true);
    const path = await invoke<string>("burn_subtitles", {
      videoId,
      subType: subtitleType,
      videoHeight: videoRef.current?.videoHeight || 1920,
    });

    if (path) {
      const a = document.createElement("a");
      a.href = path;
      a.download = "subtitled_video.mp4";
      a.click();
    }
    setDownloading(false);
  }

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
      <div className="flex justify-start my-4 max-w-[70%] mx-auto flex-col">
        <button
          className="bg-blue-500 text-white p-2 rounded-md w-80"
          onClick={createSubtitles}
          disabled={loading || !apiKey}
        >
          {loading
            ? "LOADING..."
            : apiKey
            ? "GENERATE SUBTITLES"
            : "ENTER API KEY"}
        </button>
        {subtitlesExist && (
          <p className="text-green-500 mt-2">Subtitles exist for this video</p>
        )}
      </div>
      <div className="flex justify-center items-center space-x-4 pt-4">
        <div className="flex justify-center flex-col">
          {showVideo && (
            <video
              id="video"
              loop
              muted
              width={videoRef.current?.videoWidth || "100%"}
              autoPlay
              controls
              preload="metadata"
              ref={videoRef}
              className="mx-auto"
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
          )}
          <div>
            {subtitlesExist && (
              <div className="flex justify-center items-center space-x-4 pt-4">
                <h2>Subtitles</h2>
                <button
                  className={`bg-green-900 text-white p-2 rounded-md w-30 ${
                    subtitleType === "words" ? "bg-green-500" : ""
                  }`}
                  onClick={() => enableSubtitle("words")}
                >
                  WORD
                </button>
                <button
                  className={`bg-green-900 text-white p-2 rounded-md w-30 ${
                    subtitleType === "segments" ? "bg-green-500" : ""
                  }`}
                  onClick={() => enableSubtitle("segments")}
                >
                  SEGMENT
                </button>
                <button
                  className={`bg-green-900 text-white p-2 rounded-md w-30 ${
                    subtitleType === "none" ? "bg-green-500" : ""
                  }`}
                  onClick={() => enableSubtitle("none")}
                >
                  NONE
                </button>
              </div>
            )}
          </div>
          <div className="flex justify-center items-center space-x-4 pt-4">
            <div className="flex justify-center items-center space-x-4 py-4">
              {subtitlesExist && (
                <button
                  className="bg-green-800 text-white p-2 rounded-md"
                  onClick={downloadVideo}
                  disabled={!subtitlesExist || downloading}
                >
                  {downloading
                    ? "DOWNLOADING..."
                    : subtitlesExist
                    ? "DOWNLOAD VIDEO"
                    : "NO SUBTITLES"}
                </button>
              )}
            </div>
          </div>
        </div>
        <VttTextArea type={subtitleType} reloadVideo={reloadVideo} />
      </div>
    </div>
  );
}

export default SubtitlesPage;
