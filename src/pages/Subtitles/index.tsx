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
  LanguageSelectProps,
  SubtitleStyle,
} from "../Editor/types";

function LanguageSelect({
  selectedLanguage,
  setSelectedLanguage,
}: LanguageSelectProps) {
  return (
    <div className="flex justify-center items-center space-x-4">
      <div className="flex justify-center items-center space-x-4 py-4">
        <label htmlFor="language-select">Select language for translation</label>
        <select
          className="bg-gray-100 p-2 rounded-md"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="zh">Chinese</option>
          <option value="ru">Russian</option>
          <option value="ar">Arabic</option>
          <option value="hi">Hindi</option>
        </select>
      </div>
    </div>
  );
}

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
          type === "3words" ? "!bg-green-500" : ""
        }`}
        onClick={() => setType("3words")}
      >
        3 WORDS
      </button>
      <button
        className={`bg-green-900 text-white p-2 rounded-md w-30 ${
          type === "4words" ? "!bg-green-500" : ""
        }`}
        onClick={() => setType("4words")}
      >
        4 WORDS
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
  const [language, setLanguage] = useState("en");
  const [subtitleType, setSubtitleType] = useState<SubtitleStyle>("none");

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
    setSubtitlesExist(false);
    await invoke<string>("transcribe_audio", {
      apiKey,
      videoId,
      language,
    });
    setSubtitlesExist(true);
    setLoading(false);
    checkSubtitles();
  }

  async function checkSubtitles() {
    if (subtitlesExist) {
      setSubtitleType("words");
    } else {
      const result = await invoke<boolean>("check_subtitles", {
        videoId,
      });
      setSubtitlesExist(result);
      setSubtitleType("words");
    }
    setTimeout(() => {
      reloadVideo();
    }, 100);
  }

  async function enableSubtitle(type: SubtitleStyle) {
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
      <LanguageSelect
        selectedLanguage={language}
        setSelectedLanguage={setLanguage}
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
                    label="3words"
                    kind="subtitles"
                    srcLang="en"
                    src={`./${videoId}_3words.vtt`}
                  />
                  <track
                    label="4words"
                    kind="subtitles"
                    srcLang="en"
                    src={`./${videoId}_4words.vtt`}
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
        {subtitlesExist && (
          <VttTextArea type={subtitleType} reloadVideo={reloadVideo} />
        )}
      </div>
    </div>
  );
}

export default SubtitlesPage;
