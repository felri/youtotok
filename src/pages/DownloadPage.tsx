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
    setLocation("/editor");
  }

  return (
    <div className="container">
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          download();
        }}
      >
        <input
          id="greet-input"
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
