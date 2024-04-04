import { useStore } from "../../store";
import Editor from "./Editor";
import "./Editor.css";

function VideoEditor() {
  const { videoId } = useStore();
  return (
    <div>
      <Editor videoUrl={`./${videoId}.mp4`} />
    </div>
  );
}

export default VideoEditor;
