import { useEffect, useState, useMemo } from "react";
import TextArea from "../../components/TextArea";
import { useStore } from "../../store";
import { invoke } from "@tauri-apps/api/core";
import { TwitterPicker } from "react-color";
import DirectionalButtons from "../../components/DirectionalButtons";
import { CueVtt, VttTextAreaProps } from "../Editor/types";

function VttTextArea({ type, reloadVideo }: VttTextAreaProps) {
  const defaultCueVtt: CueVtt = {
    color: "#fccb00",
    fontWeight: "bold",
    background: "#00000000",
    fontFamily: "sans-serif",
    textShadow: "2px 2px 4px #000000",
    fontSize: "40px",
  };
  const { videoId } = useStore();
  const [text, setText] = useState("");
  const [style, setStyle] = useState<CueVtt>(defaultCueVtt);
  const [lineValue, setLineValue] = useState(50);

  function processVtt() {
    // Remove styles
    let lines = text.split("\n");
    let inStyleBlock = false;
    let newLines: string[] = lines.reduce((acc: string[], line) => {
      if (line.startsWith("::cue") || line.startsWith("STYLE")) {
        inStyleBlock = true;
      }
      if (!inStyleBlock) {
        acc.push(line);
      }
      if (line.trim() === "}") {
        inStyleBlock = false;
      }
      return acc;
    }, []);
    // Remove 3 consecutive new lines
    for (let i = 0; i < newLines.length; i++) {
      if (
        newLines[i] === "" &&
        newLines[i + 1] === "" &&
        newLines[i + 2] === ""
      ) {
        newLines.splice(i, 1);
      }
    }
    let textWithoutStyle = newLines.join("\n");

    // Add styles
    lines = textWithoutStyle.split("\n");
    newLines = lines.map((line) => {
      if (line.startsWith("WEBVTT")) {
        return `WEBVTT\n\nSTYLE\n::cue {\ncolor: ${style.color};\nfont-weight: ${style.fontWeight};\nbackground-color: ${style.background};\nfont-family: ${style.fontFamily};\ntext-shadow: ${style.textShadow};\nfont-size: ${style.fontSize};\n}`;
      }
      return line;
    });
    let textWithStyle = newLines.join("\n");

    // Remove line params
    lines = textWithStyle.split("\n");
    newLines = lines.map((line) => {
      if (line.includes("-->")) {
        // remove line: 0% at the end of the line
        return line.replace(/\sline:\d+%/g, "");
      }
      return line;
    });
    let textWithoutLineParams = newLines.join("\n");

    // Add line params
    lines = textWithoutLineParams.split("\n");
    newLines = lines.map((line) => {
      if (line.includes("-->")) {
        // append line: 50% at the end of the line
        return `${line} line:${lineValue}%`;
      }
      return line;
    });
    let finalText = newLines.join("\n");

    if (finalText.length === 0) {
      return;
    }

    setText(finalText);
    saveVtt(finalText);
  }

  useEffect(() => {
    processVtt();
  }, [style, lineValue]);

  async function loadVtt() {
    if (!videoId) return;

    if (type === "none") {
      setText("");
      return;
    }

    await invoke("load_vtt", { videoId, subType: type }).then((response) => {
      setText(response as string);
      setTimeout(() => {
        processVtt();
      }, 50);
    });
  }

  function handleStyleChange(newStyle: Partial<CueVtt>) {
    setStyle({ ...style, ...newStyle });
  }

  async function saveVtt(newText?: string) {
    await invoke("update_vtt", {
      videoId,
      subType: type,
      vttContent: newText || text,
    });
    // for the changes to take effect, we need to reload the video
    reloadVideo();
  }

  useEffect(() => {
    loadVtt();
  }, [videoId, type]);

  function handleLineChange(direction: "up" | "down") {
    if (direction === "down") {
      setLineValue((prev) => (prev === 100 ? 100 : prev + 5));
    } else {
      setLineValue((prev) => (prev === 0 ? 0 : prev - 5));
    }
  }

  if (!videoId) {
    return null;
  }

  return (
    <div className=" w-full h-full max-w-[40vw] min-h-[40vh] mb-4">
      <TextArea value={text} onChange={setText} />
      <div className="flex justify-between mb-4">
        <button
          className="bg-green-800 text-white p-2 rounded-md"
          onClick={loadVtt}
        >
          REFRESH
        </button>
        <button
          className="bg-green-800 text-white p-2 rounded-md"
          onClick={() => saveVtt()}
        >
          SAVE CHANGES
        </button>
      </div>
      <div className="flex justify-between">
        <div className="flex justify-start flex-col items-start mb-4">
          <label className="mb-2">Color</label>
          <TwitterPicker
            color={style.color}
            onChangeComplete={(color) =>
              handleStyleChange({
                color: color.hex,
              })
            }
          />
        </div>
        <DirectionalButtons moveLine={handleLineChange} />
        <div className="flex justify-start flex-col items-start mb-4">
          <label className="mb-2">
            Background{" "}
            <button
              className="text-xm p-0"
              onClick={() => {
                handleStyleChange({
                  background: "#00000000",
                });
              }}
            >
              [remove]
            </button>
          </label>
          <TwitterPicker
            color={style.color}
            onChangeComplete={(color) =>
              handleStyleChange({
                background: color.hex,
              })
            }
          />
        </div>
      </div>
      <div className="flex justify-between">
        <div className="flex justify-start flex-col items-start mb-4">
          <label className="mb-2">Font Family</label>
          <select
            value={style.fontFamily}
            onChange={(e) =>
              handleStyleChange({
                fontFamily: e.target.value,
              })
            }
          >
            <option value="sans-serif">Sans-serif</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
          </select>
        </div>
        <div className="flex justify-start flex-col items-start mb-4">
          <label className="mb-2">Font Weight</label>
          <select
            value={style.fontWeight}
            onChange={(e) =>
              handleStyleChange({
                fontWeight: e.target.value,
              })
            }
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>
      </div>
      <div className="flex justify-between">
        <div className="flex justify-start flex-col items-start mb-4">
          <label className="mb-2">Text Shadow</label>
          <input
            type="text"
            value={style.textShadow}
            onChange={(e) =>
              handleStyleChange({
                textShadow: e.target.value,
              })
            }
          />
        </div>
        <div className="flex justify-start flex-col items-start mb-4">
          <label className="mb-2">Font Size</label>
          <input
            type="text"
            value={style.fontSize}
            onChange={(e) =>
              handleStyleChange({
                fontSize: e.target.value,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

export default VttTextArea;
