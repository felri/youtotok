import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store";
import { useLocation } from "wouter";
import { open } from "@tauri-apps/plugin-dialog";
import { AiOutlineLoading } from "react-icons/ai";

function DropZone() {
  const [_, setLocation] = useLocation();
  const { setVideoId } = useStore();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Video",
          extensions: ["mp4", "webm", "mkv"],
        },
      ],
    });
    if (selected) {
      setLoading(true);
      const videoId = await invoke<string>("copy_file", {
        filepath: selected.path,
      });
      setVideoId(videoId);
      setTimeout(() => {
        setLoading(false);
        setLocation("/trim");
      }, 500);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 m-4">
      <label htmlFor="file-upload">Upload a video file:</label>
      {loading ? (
        <AiOutlineLoading className="animate-spin" />
      ) : (
        <div
          onClick={onClick}
          className="p-2 border border-gray-300 rounded-md w-80 cursor-pointer"
        >
          Click to upload
        </div>
      )}
    </div>
  );
}

function DownloadPage() {
  const { setVideoId } = useStore();
  const [_, setLocation] = useLocation();
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=wLJLLKMdxnQ");
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    const path = await invoke<string>("download_youtube_video", { url });
    setVideoId(path);
    setLoading(false);
    setLocation("/trim");
  }

  return (
    <div className="container flex flex-col items-center justify-center">
      <DropZone />
      <p className="font-bold">or</p>
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
        <button type="submit" className="min-w-40 bg-green-800">
          Trim
        </button>
      </form>
      {loading && <p>Downloading...</p>}
    </div>
  );
}

export default DownloadPage;
