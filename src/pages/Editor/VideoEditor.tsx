import { useStore } from "../../store";
import { invoke } from "@tauri-apps/api/core";
import type { Timings } from "./types";

import Editor from "./Editor";
import "./Editor.css";

function VideoEditor() {
  const { videoId } = useStore();

  async function trimVideo(timings: Timings[]) {
    const response = await invoke("trim_video", { videoId, timings });
    console.log(response);
  }

  return (
    <div>
      <Editor videoUrl={`./${videoId}.mp4`} trimVideo={trimVideo} />
    </div>
  );
}

export default VideoEditor;
