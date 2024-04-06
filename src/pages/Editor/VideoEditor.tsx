import { useEffect, useState } from "react";
import { useStore } from "../../store";
import { invoke } from "@tauri-apps/api/core";
import type { Timings } from "./types";

import Editor from "./Editor";
import "./Editor.css";
import { useLocation } from "wouter";

function VideoEditor() {
  const { videoId } = useStore();
  const [loading, setLoading] = useState(false);
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!videoId) {
      setLocation("/");
    }
  }, []);

  async function trimVideo(timings: Timings[]) {
    setLoading(true);
    const response = await invoke("trim_video", { videoId, timings });
    console.log(response);
    setLoading(false);
    setLocation("/subtitles");
  }

  return (
    <div>
      <Editor
        videoUrl={`./${videoId}.mp4`}
        trimVideo={trimVideo}
        loading={loading}
      />
    </div>
  );
}

export default VideoEditor;
