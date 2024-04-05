import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store";
import { useLocation } from "wouter";

function DownloadPage() {
  const { setVideoId } = useStore();
  const [_, setLocation] = useLocation();
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=geJbZFxKwiM");
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    const path = await invoke<string>("download_youtube_video", { url });
    setVideoId(path);
    setLoading(false);
    setLocation("/trim");
  }

  return (
    <div className="container">
      <form
        className="flex flex-col items-center justify-center space-y-4 m-4"
        onSubmit={(e) => {
          e.preventDefault();
          download();
        }}
      >
        <label htmlFor="greet-input">Enter a youtube url:</label>
        <input
          id="greet-input"
          className="p-2 border border-gray-300 rounded-md w-80"
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
          placeholder="Enter a youtube url..."
        />
        <button type="submit">Edit</button>
      </form>
      {loading && <p>Downloading...</p>}
    </div>
  );
}

export default DownloadPage;
