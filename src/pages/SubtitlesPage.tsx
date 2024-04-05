import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store";
import { useLocation } from "wouter";
import ReactPlayer from "react-player";

function SubtitlesPage() {
  const { videoId } = useStore();
  const [_, setLocation] = useLocation();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load the API key from localStorage when the component mounts
    const storedApiKey = localStorage.getItem("openAiApiKey");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  useEffect(() => {
    // Save the API key to localStorage whenever it changes
    localStorage.setItem("openAiApiKey", apiKey);
  }, [apiKey]);

  async function createSubtitles() {
    setLoading(true);
    const response = await invoke<string>("transcribe_audio", { apiKey, videoId });
    console.log(response);
    setLoading(false);
    // setLocation("/trim");
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
          value={apiKey}
          onChange={(e) => setApiKey(e.currentTarget.value)}
          placeholder="Enter your OpenAI key..."
        />
      </div>
      <div className="flex justify-center">
        <ReactPlayer
          url={`./${videoId}_trimmed.mp4`}
          controls
          height="auto"
          width="50%"
        />
      </div>
      <div className="flex justify-start mt-4 max-w-[70%] mx-auto">
        <button
          className="bg-blue-500 text-white p-2 rounded-md w-80"
          onClick={createSubtitles}
          disabled={loading}
        >
          {loading ? "Loading..." : "Create subtitles"}
        </button>
      </div>
    </div>
  );
}

export default SubtitlesPage;
