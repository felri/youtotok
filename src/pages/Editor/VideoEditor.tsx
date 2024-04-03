/* eslint-disable func-names */
import { useState, useEffect } from "react";
import { FaMoon, FaLightbulb } from "react-icons/fa";
import { useStore } from "../../store";
import type { Timings } from "./types";
import Editor from "./Editor";
import "./Editor.css";



function VideoEditor() {
  const { videoId } = useStore();
  //Boolean state handling whether light or dark mode has been chosen
  const [isDarkMode, setIsDarkMode] = useState(false);

  //Stateful array handling storage of the start and end times of videos
  const [timings, setTimings] = useState<Timings[]>([{
    start: 0,
    end: 0,
  }]);

  //Lifecycle handling light and dark themes
  useEffect(() => {
    toggleThemes();
    document.addEventListener("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Function handling the light and dark themes logic
  const toggleThemes = () => {
    if (isDarkMode) {
      document.body.style.backgroundColor = "#1f242a";
      document.body.style.color = "#fff";
    }
    if (!isDarkMode) {
      document.body.style.backgroundColor = "#fff";
      document.body.style.color = "#1f242a";
    }
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div>
      {/* Boolean to handle whether to render the file uploader or the video editor */}
      <Editor
        videoUrl={`./${videoId}.mp4`}
        timings={timings}
        setTimings={setTimings}
      />
      <div className={"theme_toggler"} onClick={toggleThemes}>
        {isDarkMode ? (
          <i className="toggle" aria-hidden="true">
            <FaLightbulb />
          </i>
        ) : (
          <i className="toggle">
            <FaMoon />
          </i>
        )}
      </div>
    </div>
  );
}

export default VideoEditor;
