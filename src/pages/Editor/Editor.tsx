// /* eslint-disable func-names */
import { useState, useRef, useEffect, WheelEvent } from "react";
import type {
  Dimensions,
  DraggableEventHandler,
  EditorProps,
  GrabberProps,
  Timings,
} from "./types";
import { useStore } from "../../store";
import AudioVisualizer from "./AudioWave";
import { IoMdPhonePortrait } from "react-icons/io";
import { Rnd, RndResizeCallback } from "react-rnd";
import "./Editor.css";
import { IoMdTrash } from "react-icons/io";
import {
  FaSync,
  FaStepBackward,
  FaStepForward,
  FaPlus,
  FaVolumeMute,
  FaVolumeUp,
  FaGripLinesVertical,
  FaPause,
  FaPlay,
} from "react-icons/fa";
import { GoZoomIn, GoZoomOut } from "react-icons/go";

const Timestamp = (props: { time: number; className?: string }) => {
  const time = props.time;
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time - hours * 3600) / 60);
  const seconds = Math.floor(time - hours * 3600 - minutes * 60);
  return (
    <span className={props.className + " text-white absolute"}>
      {hours < 10 ? "0" : ""}
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

function Editor({ videoUrl, trimVideo, loading, videoId }: EditorProps) {
  const { currentTimings, setCurrentTimings } = useStore();
  const [timings, setTimings] = useState<Timings[]>(currentTimings);

  const initialWidth = 200;
  const initialHeight = 356;

  const [dimensions, setDimensions] = useState<Dimensions>({
    x: 0,
    y: 0,
    width: initialWidth,
    height: initialHeight,
  });

  const [currentTime, setCurrentTime] = useState(0);

  const [dragging, setDragging] = useState(false);

  const [cursorX, setCursorX] = useState(0);
  const [cursorTime, setCursorTime] = useState(0);
  const [showCursor, setShowCursor] = useState(false);

  //Boolean state to handle video mute
  const [isMuted, setIsMuted] = useState(true);

  //Boolean state to handle whether video is playing or not
  const [playing, setPlaying] = useState(false);

  //Float integer state to help with trimming duration logic
  const [difference, setDifference] = useState(0.2);

  //Boolean state to handle deleting grabber functionality
  const [deletingGrabber, setDeletingGrabber] = useState<GrabberProps>({
    deletingGrabber: false,
    currentWarning: null,
  });

  const [showPhoneModal, setShowPhoneModal] = useState(false);

  //Ref handling metadata needed for trim markers
  const currentlyGrabbedRef = useRef({ index: 0, type: "none" });

  //Ref handling the initial video element for trimming
  const playVideoRef = useRef<HTMLVideoElement>(null);

  //Ref handling the progress bar element
  const progressBarRef = useRef<HTMLDivElement>(null);

  //Ref handling the element of the current play time
  const playBackBarRef = useRef<HTMLDivElement>(null);

  const parentVideoRef = useRef<HTMLDivElement>(null);

  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    setCurrentTimings(timings);
  }, [timings]);

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
      if (event.key === "m") {
        setIsMuted(!isMuted);
      }
    };

    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [playing, isMuted]);

  useEffect(() => {
    addActiveSegments();
  }, [timings]);

  const updateCursor = (e: any) => {
    setShowCursor(true);
    const rect = playBackBarRef?.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setCursorX(e.clientX - rect.left);
    // set the cursor time
    setCursorTime(
      ((e.clientX - rect.left) / rect.width) *
        (playVideoRef?.current?.duration || 0)
    );
  };

  const handleMouseMoveWhenGrabbed = (event: MouseEvent) => {
    if (
      !playVideoRef.current ||
      !playBackBarRef.current ||
      !progressBarRef.current
    ) {
      return;
    }
    pauseVideo();
    setDragging(true);

    const playbackRect = playBackBarRef.current.getBoundingClientRect();
    const seekRatio = calculateSeekRatio(event.clientX, playbackRect);
    const { index, type } = currentlyGrabbedRef.current;
    const seekTime = calculateSeekTime(
      playVideoRef.current.duration,
      seekRatio
    );

    if (type === "start") {
      handleStartType(seekTime, index);
    } else if (type === "end") {
      handleEndType(seekTime, index);
    }

    setTimings(timings);
  };

  const pauseVideo = () => {
    if (playVideoRef.current) {
      playVideoRef.current.pause();
      setPlaying(false);
    }
  };

  const playVideo = () => {
    if (playVideoRef.current) {
      playVideoRef.current.play();
      setPlaying(true);
    }
  };

  const calculateSeekRatio = (clientX: number, playbackRect: DOMRect) => {
    return (clientX - playbackRect.left) / playbackRect.width;
  };

  const calculateSeekTime = (duration: number, seekRatio: number) => {
    return duration * seekRatio;
  };

  const handleStartType = (seekTime: number, index: number) => {
    if (!progressBarRef.current || !playVideoRef.current) {
      return;
    }

    if (
      seekTime > (index !== 0 ? timings[index - 1].end + difference : 0) &&
      seekTime < timings[index].end - difference
    ) {
      playVideoRef.current.currentTime = seekTime;
      timings[index]["start"] = seekTime;
    }
  };

  const handleEndType = (seekTime: number, index: number) => {
    if (!progressBarRef.current || !playVideoRef.current) {
      return;
    }
    if (
      seekTime > timings[index].start + difference &&
      seekTime < playVideoRef.current.duration
    ) {
      timings[index]["end"] = seekTime;
    }
  };

  //Function that handles removing event listener from the mouse event on trimmer - Desktop browser
  const removeMouseMoveEventListener = () => {
    window.removeEventListener("mousemove", handleMouseMoveWhenGrabbed);
    window.removeEventListener("mouseup", removeMouseMoveEventListener);
    setDragging(false);
    addActiveSegments();
    playVideo();
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

  //Function handling skip to previous logic
  const skipPrevious = () => {
    if (!playVideoRef.current || !progressBarRef.current) {
      return;
    }

    let prevIndex =
      currentlyGrabbedRef.current.index !== 0
        ? currentlyGrabbedRef.current.index - 1
        : 0;

    currentlyGrabbedRef.current = { index: prevIndex, type: "start" };

    progressBarRef.current.style.left = `${
      (timings[prevIndex].start / playVideoRef.current.duration) * 100
    }%`;

    progressBarRef.current.style.width = "0%";

    playVideoRef.current.currentTime = timings[prevIndex].start;

    addActiveSegments();
  };

  //Function handling play and pause logic
  const playPause = () => {
    if (!playVideoRef.current || !progressBarRef.current) {
      return;
    }

    if (playing) {
      playVideoRef.current.pause();
    } else {
      playVideoRef?.current?.play();
    }
    setPlaying(!playing);
  };

  //Function handling skip to next logic
  const skipNext = () => {
    if (!playVideoRef.current || !progressBarRef.current) {
      return;
    }

    let nextIndex =
      currentlyGrabbedRef.current.index !== timings.length - 1
        ? currentlyGrabbedRef.current.index + 1
        : 0;

    currentlyGrabbedRef.current = { index: nextIndex, type: "start" };

    progressBarRef.current.style.left = `${
      (timings[nextIndex].start / playVideoRef.current.duration) * 100
    }%`;

    progressBarRef.current.style.width = "0%";

    playVideoRef.current.currentTime = timings[nextIndex].start;

    addActiveSegments();
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
    const inactiveColor = "#1a1a1a"; // Semi-transparent gray color

    let overlays = [];

    // remove all overlay divs
    const overlayDivs = document.querySelectorAll("#overlay");
    overlayDivs.forEach((div) => {
      div.remove();
    });

    for (let i = 0; i < timings.length; i++) {
      const currentSegment = timings[i];
      const nextSegment = timings[i + 1];

      // Add inactive segment before the current active segment
      const inactiveStart =
        i === 0 ? 0 : (timings[i - 1].end / videoLength) * 100;
      const inactiveEnd = (currentSegment.start / videoLength) * 100;

      // Add overlay div for inactive segment
      overlays.push({
        start: inactiveStart,
        end: inactiveEnd,
      });

      // Add active segment
      const activeEnd = (currentSegment.end / videoLength) * 100;

      // Add inactive segment after the current active segment (if there is a next segment)
      if (nextSegment) {
        const nextInactiveStart = activeEnd;
        const nextInactiveEnd = (nextSegment.start / videoLength) * 100;

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
      (timings[timings.length - 1].end / videoLength) * 100;

    // Add overlay div for final inactive segment
    overlays.push({
      start: finalInactiveStart,
      end: 100,
    });

    playBackBarRef.current.style.background = `#eee`;

    // Create overlay divs
    overlays.forEach((overlay) => {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.id = "overlay";
      div.style.left = `${overlay.start}%`;
      div.style.width = `${overlay.end - overlay.start}%`;
      div.style.height = "100%";
      div.style.zIndex = "10";
      div.style.backgroundColor = inactiveColor;
      playBackBarRef?.current?.appendChild(div);
    });
  };

  const getPercentageDimensions = (
    dimensions: Dimensions,
    parentDiv: HTMLDivElement
  ) => {
    return {
      width: (dimensions.width / parentDiv.offsetWidth) * 100,
      height: (dimensions.height / parentDiv.offsetHeight) * 100,
      x: (dimensions.x / parentDiv.offsetWidth) * 100,
      y: (dimensions.y / parentDiv.offsetHeight) * 100,
    };
  };

  // Function handling logic for post trimmed video
  const handleTrim = async () => {
    if (!playVideoRef.current || !parentVideoRef.current) {
      return;
    }

    const percentageDimensions = getPercentageDimensions(
      dimensions,
      parentVideoRef.current
    );
    if (showPhoneModal) {
      trimVideo(timings, percentageDimensions);
    } else {
      trimVideo(timings);
    }
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

  const handleResize: RndResizeCallback = (
    _,
    dir,
    refToElement,
    __,
    position
  ) => {
    const aspectRatio = initialWidth / initialHeight;
    let newWidth = refToElement.offsetWidth;
    let newHeight = newWidth / aspectRatio;

    if (dir === "top" || dir === "bottom") {
      newHeight = refToElement.offsetHeight;
      newWidth = newHeight * aspectRatio;
    }

    // Get the parent div
    const parentDiv = parentVideoRef.current;

    // Check if the new height is higher than the parent div
    if (parentDiv && newHeight > parentDiv.offsetHeight) {
      newHeight = parentDiv.offsetHeight;
      newWidth = newHeight * aspectRatio;
    }

    setDimensions({
      x: position.x,
      y: position.y,
      width: newWidth,
      height: newHeight,
    });
  };

  const handleDrag: DraggableEventHandler = (_, data) => {
    setDimensions({
      x: data.x,
      y: data.y,
      width: dimensions.width,
      height: dimensions.height,
    });
  };

  const handleZoomIn = () => {
    setZoomLevel(zoomLevel + 0.1);
    addActiveSegments();
  };

  const handleZoomOut = () => {
    if (zoomLevel <= 1) {
      return;
    }
    setZoomLevel(zoomLevel - 0.1); // Decrease the zoom level by 0.1
    addActiveSegments();
  };

  // handle zoom by scroll wheel when shift key is pressed
  const handleScroll = (e: WheelEvent<HTMLDivElement>) => {
    if (!e.shiftKey) {
      return;
    }
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  return (
    <div className="wrapper">
      <div
        className="mx-auto block relative w-auto h-auto max-w-[70%]"
        ref={parentVideoRef}
      >
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
        {showPhoneModal && (
          <Rnd
            size={{ width: dimensions.width, height: dimensions.height }}
            position={{ x: dimensions.x, y: dimensions.y }}
            onResize={handleResize}
            onDragStop={handleDrag}
            bounds="parent"
            style={{
              border: "3px solid red",
            }}
          />
        )}
      </div>

      <div className="controls flex justify-center items-center mt-4">
        <div className="flex space-x-1">
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
            onClick={() => setShowPhoneModal(!showPhoneModal)}
          >
            <IoMdPhonePortrait />
          </button>
          <button className="settings-control" onClick={handleZoomIn}>
            <GoZoomIn />
          </button>
          <button className="settings-control" onClick={handleZoomOut}>
            <GoZoomOut />
          </button>
        </div>
        <div className="player-controls flex space-x-1 mx-2">
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
        <div className="player-controls flex justify-center items-center space-x-1">
          <button
            title="Add grabber"
            className="flex justify-center items-center play-control"
            onClick={addGrabber}
          >
            <FaPlus /> <FaGripLinesVertical />
          </button>
          <button
            title="Delete grabber"
            className="flex justify-center items-center play-control"
            onClick={preDeleteGrabber}
          >
            <IoMdTrash /> <FaGripLinesVertical />
          </button>
          <button
            title="Save changes"
            className="bg-green-800 text-white px-4 py-2 rounded-md"
            onClick={handleTrim}
            disabled={loading}
          >
            {loading ? "LOADING..." : "TRIM"}
          </button>
        </div>
      </div>
      <div className="w-full overflow-auto overflow-y-hidden">
        <div
          className="relative min-w-full"
          style={{
            width: `${100 * zoomLevel}%`, // Adjust the width based on the zoom level
            overflow: "auto",
            overflowY: "hidden",
          }}
        >
          <div className="playback mb-10" onWheel={handleScroll}>
            <Timestamp time={0} className=" -bottom-8" />
            {/* If there is an instance of the playVideoRef, render the trimmer markers */}
            {timings.map((timing, index) => (
              <div key={"segment_" + index} className="segment">
                <div
                  id="grabberStart"
                  className="grabber start z-30 -ml-4"
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
                      (timing.start / (playVideoRef?.current?.duration || 1)) *
                      100
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
                      (timing.end / (playVideoRef?.current?.duration || 1)) *
                      100
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
              onMouseMove={updateCursor}
              onMouseLeave={() => setShowCursor(false)}
            >
              {showCursor && (
                <div
                  className="absolute top-0 bottom-0 bg-red-800 z-50"
                  style={{
                    left: `${cursorX}px`,
                    width: "1px",
                  }}
                >
                  <Timestamp time={cursorTime} className="-right-5 -top-7" />
                </div>
              )}
              <AudioVisualizer videoId={videoId} />
            </div>
            <div className="progress relative" ref={progressBarRef}>
              <div className="absolute top-0 left-0 w-full h-full">
                <Timestamp time={currentTime} className="-right-5 -top-7" />
              </div>
            </div>
            <Timestamp
              time={playVideoRef?.current?.duration || 0}
              className="-right-5 -bottom-8"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Editor;
