import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store";
import { useLocation } from "wouter";
import { FileUploader } from "react-drag-drop-files";
import { open } from "@tauri-apps/plugin-dialog";

function DropZone() {
  const [_, setLocation] = useLocation();
  const { setVideoId } = useStore();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: 'Video',
          extensions: ['mp4', 'webm', 'mkv'],
        },
      ],
    });
    console.log(selected);
    // if (selected) {
    //   setLoading(true);
    //   const path = await invoke<string>("upload_file", { file: selected });
    //   setVideoId(path);
    //   setLoading(false);
    //   setLocation("/trim");
    // }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 m-4">
      <label htmlFor="file-upload">Upload a video file:</label>
      <div
        onClick={onClick}
        className="p-2 border border-gray-300 rounded-md w-80 cursor-pointer"
      >
        Click to upload
      </div>
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
      <p className="text-2xl font-bold">OR</p>
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
