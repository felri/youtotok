import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../../store";
import { useLocation } from "wouter";
import VttTextArea from "./VttTextArea";
import {
  DownloadButtonProps,
  SubtitleOptionsProps,
  GenerateSubtitlesButtonProps,
  ApiKeyComponentProps,
} from "../Editor/types";

function ApiKeyComponent({ apiKey, setApiKey }: ApiKeyComponentProps) {
  return (
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
  );
}

function GenerateSubtitlesButton({
  createSubtitles,
  loading,
  apiKey,
  subtitlesExist,
}: GenerateSubtitlesButtonProps) {
  return (
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
  );
}

function SubtitleOptions({
  type,
  setType,
  subtitlesExist,
}: SubtitleOptionsProps) {
  if (!subtitlesExist) return null;
  console.log(type);
  return (
    <div className="flex justify-center items-center space-x-4 pt-4">
      <h2>Subtitles</h2>
      <button
        className={`bg-green-900 text-white p-2 rounded-md w-30 ${
          type === "words" ? "!bg-green-500" : ""
        }`}
        onClick={() => setType("words")}
      >
        WORD
      </button>
      <button
        className={`bg-green-900 text-white p-2 rounded-md w-30 ${
          type === "segments" ? "!bg-green-500" : ""
        }`}
        onClick={() => setType("segments")}
      >
        SEGMENT
      </button>
      <button
        className={`bg-green-900 text-white p-2 rounded-md w-30 ${
          type === "none" ? "!bg-green-500" : ""
        }`}
        onClick={() => setType("none")}
      >
        NONE
      </button>
    </div>
  );
}

function DownloadButton({
  subtitlesExist,
  videoId,
  subtitleType,
  videoRef,
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

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
  );
}

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
  const [subtitleType, setSubtitleType] = useState<
    "words" | "segments" | "none"
  >("none");

  useEffect(() => {
    if (!videoId) {
      setLocation("/");
    }
    const storedApiKey = localStorage.getItem("openAiApiKey");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    checkSubtitles();
  }, [videoId]);

  useEffect(() => {
    if (!apiKey) return;
    localStorage.setItem("openAiApiKey", apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (showVideo && subtitlesExist) {
      enableSubtitle(subtitleType);
    }
  }, [showVideo]);

  async function createSubtitles() {
    setLoading(true);
    await invoke<string>("transcribe_audio", {
      apiKey,
      videoId,
    });
    setLoading(false);
    checkSubtitles();
  }

  async function checkSubtitles() {
    if (subtitlesExist) {
      setSubtitleType("words");
      return;
    }
    const result = await invoke<boolean>("check_subtitles", {
      videoId,
    });
    setSubtitlesExist(result);
    setSubtitleType("words");
    setTimeout(() => {
      reloadVideo();
    }, 100);
  }

  async function enableSubtitle(type: "words" | "segments" | "none") {
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

  async function reloadVideo() {
    setShowVideo(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    setShowVideo(true);
  }

  return (
    <div className="container">
      <ApiKeyComponent apiKey={apiKey} setApiKey={setApiKey} />
      <GenerateSubtitlesButton
        createSubtitles={createSubtitles}
        loading={loading}
        apiKey={apiKey}
        subtitlesExist={subtitlesExist}
      />
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
                    // srcLang="en"
                    src={`./${videoId}.vtt`}
                  />
                </>
              )}
            </video>
          )}
          <SubtitleOptions
            type={subtitleType}
            setType={enableSubtitle}
            subtitlesExist={subtitlesExist}
          />
          <DownloadButton
            subtitlesExist={subtitlesExist}
            videoId={videoId}
            subtitleType={subtitleType}
            videoRef={videoRef}
          />
        </div>
        <VttTextArea type={subtitleType} reloadVideo={reloadVideo} />
      </div>
    </div>
  );
}

export default SubtitlesPage;
