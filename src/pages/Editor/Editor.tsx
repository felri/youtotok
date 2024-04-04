// /* eslint-disable func-names */
import { useState, useRef, useEffect } from "react";
import type { EditorProps, GrabberProps, Timings } from "./types";
import AudioVisualizer from "./AudioWave";
import "./Editor.css";
import {
  FaSync,
  FaStepBackward,
  FaStepForward,
  FaCamera,
  FaDownload,
  FaEraser,
  FaVolumeMute,
  FaVolumeUp,
  FaGripLinesVertical,
  FaPause,
  FaPlay,
} from "react-icons/fa";

const Timestamp = (props: { time: number; className?: string }) => {
  const time = props.time;
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time - hours * 3600) / 60);
  const seconds = Math.floor(time - hours * 3600 - minutes * 60);
  return (
    <span className={props.className + " text-white absolute -top-7"}>
      {hours}:{minutes < 10 ? "0" : ""}
      {minutes}:{seconds < 10 ? "0" : ""}
      {seconds}
    </span>
  );
};

const Grabber = () => (
  <svg
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    x="0"
    y="0"
    width="10"
    height="14"
    viewBox="0 0 10 14"
    xmlSpace="preserve"
  >
    <path
      className="st0"
      d="M1 14L1 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C2 13.6 1.6 14 1 14zM5 14L5 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C6 13.6 5.6 14 5 14zM9 14L9 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C10 13.6 9.6 14 9 14z"
    />
  </svg>
);

function Editor({ videoUrl }: EditorProps) {
  const [timings, setTimings] = useState<Timings[]>([
    {
      start: 0,
      end: 0,
    },
  ]);

  const [currentTime, setCurrentTime] = useState(0);

  const [dragging, setDragging] = useState(false);

  //Boolean state to handle video mute
  const [isMuted, setIsMuted] = useState(false);

  //Boolean state to handle whether video is playing or not
  const [playing, setPlaying] = useState(false);

  //Float integer state to help with trimming duration logic
  const [difference, setDifference] = useState(0.2);

  //Boolean state to handle deleting grabber functionality
  const [deletingGrabber, setDeletingGrabber] = useState<GrabberProps>({
    deletingGrabber: false,
    currentWarning: null,
  });

  //State for error handling
  const [currentWarning, setCurrentWarning] = useState(null);

  //State for imageUrl
  const [imageUrl, setImageUrl] = useState("");

  // //Integer state to blue progress bar as video plays
  // const [seekerBar, setSeekerBar] = useState(0);

  //Ref handling metadata needed for trim markers
  const currentlyGrabbedRef = useRef({ index: 0, type: "none" });

  //Ref handling the initial video element for trimming
  const playVideoRef = useRef<HTMLVideoElement>(null);

  //Ref handling the progress bar element
  const progressBarRef = useRef<HTMLDivElement>(null);

  //Ref handling the element of the current play time
  const playBackBarRef = useRef<HTMLDivElement>(null);

  //Variable for error handling on the delete grabber functionality
  const warnings = {
    delete_grabber: (
      <div>Please click on the grabber (either start or end) to delete it</div>
    ),
  };

  useEffect(() => {
    if (playVideoRef.current) {
      playVideoRef.current.onloadedmetadata = () => {
        setTimings([{ start: 0, end: playVideoRef?.current?.duration || 0 }]);
      };
    }
  }, [playVideoRef.current]);

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") {
        playPause();
      }
    };

    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [playing]);

  useEffect(() => {
    addActiveSegments();
  }, [timings]);

  const handleMouseMoveWhenGrabbed = (event: MouseEvent) => {
    if (
      !playVideoRef.current ||
      !playBackBarRef.current ||
      !progressBarRef.current
    ) {
      return;
    }

    setDragging(true);
    playPause();

    const playbackRect = playBackBarRef.current.getBoundingClientRect();
    const seekRatio = calculateSeekRatio(event.clientX, playbackRect);
    const { index, type } = currentlyGrabbedRef.current;
    const seekTime = calculateSeekTime(
      playVideoRef.current.duration,
      seekRatio
    );

    if (type === "start") {
      handleStartType(seekTime, seekRatio, index);
    } else if (type === "end") {
      handleEndType(seekTime, index);
    }

    setTimings(timings);
    setCurrentTime(seekTime);
    progressBarRef.current.style.width = "0%";

    // playVideoRef.current.currentTime = seekTime;
  };

  const calculateSeekRatio = (clientX: number, playbackRect: DOMRect) => {
    return (clientX - playbackRect.left) / playbackRect.width;
  };

  const calculateSeekTime = (duration: number, seekRatio: number) => {
    return duration * seekRatio;
  };

  const handleStartType = (
    seekTime: number,
    seekRatio: number,
    index: number
  ) => {
    if (!progressBarRef.current || !playVideoRef.current) {
      return;
    }

    if (
      seekTime >
        (index !== 0 ? timings[index - 1].end + difference + 0.2 : 0) &&
      seekTime < timings[index].end - difference
    ) {
      progressBarRef.current.style.left = `${seekRatio * 100}%`;
      playVideoRef.current.currentTime = seekTime;
      timings[index]["start"] = seekTime;
    }
  };

  const handleEndType = (seekTime: number, index: number) => {
    if (!progressBarRef.current || !playVideoRef.current) {
      return;
    }

    console.log("Seek Time: ", seekTime);

    if (
      seekTime > timings[index].start + difference &&
      seekTime < playVideoRef.current.duration
    ) {
      progressBarRef.current.style.left = `${
        (timings[index].start / playVideoRef.current.duration) * 100
      }%`;
      playVideoRef.current.currentTime = timings[index].start;
      timings[index]["end"] = seekTime;
    }
  };

  //Function that handles removing event listener from the mouse event on trimmer - Desktop browser
  const removeMouseMoveEventListener = () => {
    window.removeEventListener("mousemove", handleMouseMoveWhenGrabbed);
    window.removeEventListener("mouseup", removeMouseMoveEventListener);
    setDragging(false);
    addActiveSegments();
  };

  //Function handling reset logic
  const reset = () => {
    if (playVideoRef.current) {
      playVideoRef.current.pause();
      playVideoRef.current.currentTime = timings[0].start;
    }

    setIsMuted(false);
    setPlaying(false);
    currentlyGrabbedRef.current = { index: 0, type: "none" };
    setDifference(0.2);
    setDeletingGrabber({
      deletingGrabber: false,
      currentWarning: null,
    });
    setCurrentWarning(null);
    setImageUrl("");

    if (playVideoRef.current) {
      setTimings([{ start: 0, end: playVideoRef.current.duration }]);
    }

    if (progressBarRef.current) {
      progressBarRef.current.style.left = `${
        (timings[0].start /
          (playVideoRef.current ? playVideoRef.current.duration : 1)) *
        100
      }%`;
      progressBarRef.current.style.width = "0%";
    }

    addActiveSegments();
  };

  //Function handling thumbnail logic
  const captureSnapshot = () => {
    let video = playVideoRef.current;
    if (!video) {
      console.error("Video reference is undefined");
      return;
    }

    const canvas = document.createElement("canvas");
    // scale the canvas accordingly
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // draw the video at that frame
    const context = canvas.getContext("2d");
    if (!context) {
      console.error("Unable to get 2D context from canvas");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    // convert it to a usable data URL
    const dataURL = canvas.toDataURL();
    setImageUrl(dataURL);
  };

  //Function handling download of thumbnail logic
  const downloadSnapshot = () => {
    let a = document.createElement("a"); //Create <a>
    a.href = imageUrl; //Image Base64 Goes here
    a.download = "Thumbnail.png"; //File name Here
    a.click(); //Downloaded file
  };

  //Function handling skip to previous logic
  const skipPrevious = () => {
    if (playing && playVideoRef.current) {
      playVideoRef.current.pause();
    }
    // let previousIndex = (currentlyGrabbed.index !== 0) ? (currentlyGrabbed.index - 1) : (timings.length - 1)
    // setCurrentlyGrabbed({currentlyGrabbed: {'index': previousIndex, 'type': 'start'}, playing: false})
    // currentlyGrabbedRef.current = {'index': previousIndex, 'type': 'start'}
    // progressBarRef.current.style.left = `${timings[previousIndex].start / playVideoRef.current.duration * 100}%`
    // progressBarRef.current.style.width = '0%'
    // playVideoRef.current.currentTime = timings[previousIndex].start
  };

  //Function handling play and pause logic
  const playPause = () => {
    if (!playVideoRef.current || !progressBarRef.current) {
      return;
    }

    if (playing) {
      playVideoRef.current.pause();
    } else {
      if (playVideoRef.current.currentTime >= timings[timings.length - 1].end) {
        playVideoRef.current.pause();
        playVideoRef.current.currentTime = timings[0].start;

        currentlyGrabbedRef.current = { index: 0, type: "start" };
        progressBarRef.current.style.left = `${
          (timings[0].start / playVideoRef.current.duration) * 100
        }%`;
        progressBarRef.current.style.width = "0%";
      }
      playVideoRef?.current?.play();
    }
    setPlaying(!playing);
  };

  //Function handling skip to next logic
  const skipNext = () => {
    if (playing && playVideoRef.current) {
      playVideoRef.current.pause();
    }
    // let nextIndex = (currentlyGrabbed.index !== (timings.length - 1)) ? (currentlyGrabbed.index + 1) : 0
    // setCurrentlyGrabbed({currentlyGrabbed: {'index': nextIndex, 'type': 'start'}, playing: false})
    // currentlyGrabbedRef.current = {'index': nextIndex, 'type': 'start'}
    // progressBarRef.current.style.left = `${timings[nextIndex].start / playVideoRef.current.duration * 100}%`
    // progressBarRef.current.style.width = '0%'
    // playVideoRef.current.currentTime = timings[nextIndex].start
  };

  //Function handling updating progress logic (clicking on progress bar to jump to different time durations)
  const updateProgress = (event: any) => {
    if (dragging) return;

    const playbackRect = playBackBarRef.current?.getBoundingClientRect();

    if (!playbackRect || !playVideoRef.current) {
      return;
    }

    const seekTime =
      ((event.clientX - playbackRect?.left) / playbackRect?.width) *
      playVideoRef.current.duration;

    let index = -1;
    for (let i = 0; i < timings.length; i++) {
      const { start, end } = timings[i];
      if (seekTime >= start && seekTime <= end) {
        index = i;
        break;
      }
    }

    if (index === -1) return;

    currentlyGrabbedRef.current = { index, type: "start" };
    progressBarRef.current?.style.setProperty("width", "0%");
    progressBarRef.current?.style.setProperty(
      "left",
      `${(timings[index].start / playVideoRef.current.duration) * 100}%`
    );
    console.log("Seek Time: ", seekTime);
    playVideoRef.current.currentTime = seekTime;
  };

  //Function handling adding new trim markers logic
  const addGrabber = () => {
    const time = timings;
    const end = time[time.length - 1].end + difference;
    setDeletingGrabber({ deletingGrabber: false, currentWarning: null });
    if (playVideoRef.current && end >= playVideoRef.current.duration) {
      return;
    }
    time.push({
      start: end + 0.2,
      end: playVideoRef.current ? playVideoRef.current.duration : 0,
    });
    setTimings(time);
    addActiveSegments();
  };

  //Function handling first step of deleting trimmer
  const preDeleteGrabber = () => {
    if (deletingGrabber.deletingGrabber) {
      setDeletingGrabber({ deletingGrabber: false, currentWarning: null });
    } else {
      setDeletingGrabber({
        deletingGrabber: true,
        currentWarning: "delete_grabber",
      });
    }
  };

  //Function handling deletion of trimmers logic
  const deleteGrabber = (index: number) => {
    let time = timings;
    setDeletingGrabber({
      deletingGrabber: false,
      currentWarning: null,
      currentlyGrabbed: { index: 0, type: "start" },
    });
    setDeletingGrabber({
      deletingGrabber: false,
      currentWarning: null,
      currentlyGrabbed: { index: 0, type: "start" },
    });
    if (time.length === 1) {
      return;
    }
    time.splice(index, 1);
    if (progressBarRef.current && playVideoRef.current) {
      progressBarRef.current.style.left = `${
        (time[0].start / playVideoRef.current.duration) * 100
      }%`;
      playVideoRef.current.currentTime = time[0].start;
      progressBarRef.current.style.width = "0%";
    }
    addActiveSegments();
  };

  const addActiveSegments = () => {
    if (!playVideoRef.current || !playBackBarRef.current) {
      return;
    }

    const videoLength = playVideoRef.current.duration;
    const inactiveColor = "#aaaa"; // Semi-transparent gray color
    const activeColor = "#fff"; // White color

    let colorStops = [];
    let overlays = [];

    // remove all overlay divs
    const overlayDivs = document.querySelectorAll("#overlay");
    overlayDivs.forEach((div) => {
      div.remove();
    });

    // Add initial inactive segment
    colorStops.push(`${inactiveColor} 0%`);

    for (let i = 0; i < timings.length; i++) {
      const currentSegment = timings[i];
      const nextSegment = timings[i + 1];

      // Add inactive segment before the current active segment
      const inactiveStart =
        i === 0 ? 0 : (timings[i - 1].end / videoLength) * 100;
      const inactiveEnd = (currentSegment.start / videoLength) * 100;
      colorStops.push(
        `${inactiveColor} ${inactiveStart}%, ${inactiveColor} ${inactiveEnd}%`
      );

      // Add overlay div for inactive segment
      overlays.push({
        start: inactiveStart,
        end: inactiveEnd,
      });

      // Add active segment
      const activeStart = inactiveEnd;
      const activeEnd = (currentSegment.end / videoLength) * 100;
      colorStops.push(
        `${activeColor} ${activeStart}%, ${activeColor} ${activeEnd}%`
      );

      // Add inactive segment after the current active segment (if there is a next segment)
      if (nextSegment) {
        const nextInactiveStart = activeEnd;
        const nextInactiveEnd = (nextSegment.start / videoLength) * 100;
        colorStops.push(
          `${inactiveColor} ${nextInactiveStart}%, ${inactiveColor} ${nextInactiveEnd}%`
        );

        // Check if overlay already exists
        const overlayExists = overlays.some(
          (overlay) =>
            overlay.start === nextInactiveStart &&
            overlay.end === nextInactiveEnd
        );
        if (!overlayExists) {
          // Add overlay div for inactive segment
          overlays.push({
            start: nextInactiveStart,
            end: nextInactiveEnd,
          });
        }
      }
    }

    // Add final inactive segment
    const finalInactiveStart =
      (timings[timings.length - 1].end / videoLength) * 100 + 1;
    colorStops.push(
      `${inactiveColor} ${finalInactiveStart}%, ${inactiveColor} 100%`
    );

    // Add overlay div for final inactive segment
    overlays.push({
      start: finalInactiveStart,
      end: 100,
    });

    const gradientColors = colorStops.join(", ");
    playBackBarRef.current.style.background = `linear-gradient(to right, ${gradientColors})`;

    // Create overlay divs
    overlays.forEach((overlay) => {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.id = "overlay";
      div.style.left = `${overlay.start}%`;
      div.style.width = `${overlay.end - overlay.start}%`;
      div.style.height = "100%";
      div.style.zIndex = "10";
      div.style.backgroundColor = "#aaaa";
      playBackBarRef?.current?.appendChild(div);
    });
  };

  // Function handling logic for post trimmed video
  const saveVideo = async (fileInput: File) => {
    let metadata = {
      trim_times: timings,
      mute: isMuted,
    };
    console.log(metadata.trim_times);
    const trimStart = metadata.trim_times[0].start;
    const trimEnd = metadata.trim_times[0].end;

    const trimmedVideo = trimEnd - trimStart;

    console.log("Trimmed Duration: ", trimmedVideo);
    console.log("Trim End: ", trimEnd);
  };

  //Function handling the progress bar logic
  const handleTimeUpdate = () => {
    if (!playVideoRef.current || !progressBarRef.current) {
      return;
    }

    const playVideo = playVideoRef.current;

    if (!dragging) {
      const seek =
        ((playVideoRef.current.currentTime - timings[0].start) /
          playVideoRef.current.duration) *
        100;
      progressBarRef.current.style.width = `${seek}%`;
      setCurrentTime(playVideoRef.current.currentTime);

      const pastSegment = timings.find(
        (segment) => playVideo.currentTime >= segment.end
      );

      const currentSegment = timings.find(
        (segment) =>
          playVideo.currentTime >= segment.start &&
          playVideo.currentTime <= segment.end
      );

      const futureSegment = timings.find(
        (segment) => playVideo.currentTime < segment.start
      );

      if (!currentSegment && futureSegment) {
        playVideo.currentTime = futureSegment.start;
        return;
      }

      if (!currentSegment && pastSegment) {
        playVideo.currentTime = pastSegment.start;
        return;
      }

      if (!currentSegment && !pastSegment && !futureSegment) {
        playVideo.currentTime = timings[0].start;
        return;
      }

      if (currentSegment) {
        // set progressbar position based on the current segment
        progressBarRef.current.style.left = `${
          (timings[0].start / playVideo.duration) * 100
        }%`;
      }
    }
  };

  return (
    <div className="wrapper">
      {/* Main video element for the video editor */}
      <video
        className="video"
        // autoload="metadata"
        muted={isMuted}
        ref={playVideoRef}
        onLoadedData={playPause}
        onClick={playPause}
        onTimeUpdate={handleTimeUpdate}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
      <div className="playback">
        <Timestamp time={0} />
        {/* If there is an instance of the playVideoRef, render the trimmer markers */}
        {timings.map((timing, index) => (
          <div key={"segment_" + index} className="segment">
            <div
              id="grabberStart"
              className="grabber start z-30"
              onMouseDown={() => {
                // set time to start based on the position of the mouse X
                if (deletingGrabber.deletingGrabber) {
                  deleteGrabber(index);
                } else {
                  currentlyGrabbedRef.current = {
                    index: index,
                    type: "start",
                  };
                  window.addEventListener(
                    "mousemove",
                    handleMouseMoveWhenGrabbed
                  );
                  window.addEventListener(
                    "mouseup",
                    removeMouseMoveEventListener
                  );
                }
              }}
              style={{
                left: `${
                  (timing.start / (playVideoRef?.current?.duration || 1)) * 100
                }%`,
              }}
            >
              <Grabber />
            </div>
            {/* Markup and logic for the end trim marker */}
            <div
              id="grabberEnd"
              className="grabber end z-30"
              style={{
                left: `${
                  (timing.end / (playVideoRef?.current?.duration || 1)) * 100
                }%`,
              }}
              //Events for desktop - End marker
              onMouseDown={() => {
                if (deletingGrabber.deletingGrabber) {
                  deleteGrabber(index);
                } else {
                  currentlyGrabbedRef.current = {
                    index: index,
                    type: "end",
                  };
                  window.addEventListener(
                    "mousemove",
                    handleMouseMoveWhenGrabbed
                  );
                  window.addEventListener(
                    "mouseup",
                    removeMouseMoveEventListener
                  );
                }
              }}
            >
              <Grabber />
            </div>
          </div>
        ))}
        <div
          className="seekable relative"
          ref={playBackBarRef}
          onClick={updateProgress}
        ></div>
        <div className="progress relative" ref={progressBarRef}>
          <div className="absolute top-0 left-0 w-full h-full">
            <Timestamp time={currentTime} className="-right-5" />
          </div>
        </div>
        <Timestamp
          time={playVideoRef?.current?.duration || 0}
          className="-right-5"
        />
      </div>
      {/* <AudioVisualizer src={videoUrl} isVideo={true} /> */}
      <div className="controls">
        <div className="player-controls">
          <button
            className="settings-control"
            title="Reset Video"
            onClick={reset}
          >
            <FaSync />
          </button>
          <button
            className="settings-control"
            title="Mute/Unmute Video"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
          <button
            className="settings-control"
            title="Capture Thumbnail"
            onClick={captureSnapshot}
          >
            <FaCamera />
          </button>
        </div>
        <div className="player-controls">
          <button
            className="seek-start"
            title="Skip to previous clip"
            onClick={skipPrevious}
          >
            <FaStepBackward />
          </button>
          <button
            className="play-control"
            title="Play/Pause"
            onClick={playPause}
          >
            {playing ? <FaPause /> : <FaPlay />}
          </button>
          <button
            className="seek-end"
            title="Skip to next clip"
            onClick={skipNext}
          >
            <FaStepForward />
          </button>
        </div>
        <div className="flex justify-center items-center space-x-2">
          <button
            title="Add grabber"
            className="play-control margined flex justify-center items-center"
            onClick={addGrabber}
          >
            ADD <FaGripLinesVertical />
          </button>
          <button
            title="Delete grabber"
            className="play-control margined flex justify-center items-center"
            onClick={preDeleteGrabber}
          >
            DELETE <FaGripLinesVertical />
          </button>
          <button
            title="Save changes"
            className="play-control margined"
            // onClick={saveVideo}
          >
            TRIM
          </button>
        </div>
      </div>
      {currentWarning != null ? (
        <div className={"warning"}>{warnings[currentWarning]}</div>
      ) : (
        ""
      )}
      {imageUrl !== "" ? (
        <div className={"marginVertical"}>
          <img src={imageUrl} className={"thumbnail"} alt="Photos" />
          <div className="controls">
            <div className="player-controls">
              <button
                className="settings-control"
                title="Reset Video"
                onClick={downloadSnapshot}
              >
                <FaDownload />
              </button>
              <button
                className="settings-control"
                title="Save Video"
                onClick={() => {
                  setImageUrl("");
                }}
              >
                <FaEraser />
              </button>
            </div>
          </div>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}

export default Editor;
