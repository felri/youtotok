import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { WaveSurfer, WaveForm, Region, Marker } from "wavesurfer-react";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
/**
 * @param min
 * @param max
 * @returns {*}
 */
function generateNum(min: number, max: number) {
  return Math.random() * (max - min + 1) + min;
}

/**
 * @param distance
 * @param min
 * @param max
 * @returns {([*, *]|[*, *])|*[]}
 */
function generateTwoNumsWithDistance(
  distance: number,
  min: number,
  max: number
) {
  const num1 = generateNum(min, max);
  const num2 = generateNum(min, max);
  // if num2 - num1 < 10
  if (num2 - num1 >= 10) {
    return [num1, num2];
  }
  return generateTwoNumsWithDistance(distance, min, max);
}

interface RegionsProps {
  id: string;
  start: number;
  end: number;
  color: string;
  data?: any;
}

interface MarkerProps {
  id?: string;
  time: number;
  label: string;
  color: string;
  draggable?: boolean;
  position?: string;
}

interface AudioWaveProps {
  videoId: string;
}

function AudioWave({ videoId }: AudioWaveProps) {
  const [timelineVis, setTimelineVis] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const [markers, setMarkers] = useState<MarkerProps[]>([
    // {
    //   time: 5.5,
    //   label: "V1",
    //   color: "#ff990a",
    //   draggable: true,
    // },
    // {
    //   time: 10,
    //   label: "V2",
    //   color: "#00ffcc",
    //   position: "top",
    // },
  ]);

  const plugins = useMemo(() => {
    return [
      // {
      //   key: "regions",
      //   plugin: RegionsPlugin,
      //   options: { dragSelection: true },
      // },
      timelineVis && {
        key: "top-timeline",
        plugin: TimelinePlugin,
        options: {
          height: 20,
          insertPosition: "beforebegin",
          style: {
            color: "#2D5B88",
          },
        },
      },
      timelineVis && {
        key: "bottom-timeline",
        plugin: TimelinePlugin,
        options: {
          height: 10,
          style: {
            color: "#6A3274",
          },
        },
      },
    ].filter(Boolean);
  }, [timelineVis]);

  // const toggleTimeline = useCallback(() => {
  //   setTimelineVis(!timelineVis);
  // }, [timelineVis]);

  const [regions, setRegions] = useState<RegionsProps[]>([
    //   {
    //     id: "region-1",
    //     start: 0.5,
    //     end: 10,
    //     color: "rgba(0, 0, 0, .5)",
    //     data: {
    //       systemRegionId: 31,
    //     },
    //   },
    //   {
    //     id: "region-2",
    //     start: 5,
    //     end: 25,
    //     color: "rgba(225, 195, 100, .5)",
    //     data: {
    //       systemRegionId: 32,
    //     },
    //   },
    //   {
    //     id: "region-3",
    //     start: 15,
    //     end: 35,
    //     color: "rgba(25, 95, 195, .5)",
    //     data: {
    //       systemRegionId: 33,
    //     },
    // },
  ]);

  // use regions ref to pass it inside useCallback
  // so it will use always the most fresh version of regions list
  const regionsRef = useRef<RegionsProps[]>(regions);

  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  const regionCreatedHandler = useCallback(
    (region: any) => {
      console.log("region-created --> region:", region);

      if (region.data.systemRegionId) return;

      setRegions([
        ...regionsRef.current,
        { ...region, data: { ...region.data, systemRegionId: -1 } },
      ]);
    },
    [regionsRef]
  );

  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const handleWSMount = useCallback(
    (waveSurfer: WaveSurfer) => {
      wavesurferRef.current = waveSurfer;

      if (wavesurferRef.current) {
        wavesurferRef.current.load(`/${videoId}_full.mp3`);

        wavesurferRef.current.on("region-created", regionCreatedHandler);

        wavesurferRef.current.on("ready", () => {
          console.log("WaveSurfer is ready");
          setIsLoaded(true);
        });

        // wavesurferRef.current.on("region-removed", (region) => {
        //   console.log("region-removed --> ", region);
        // });

        // wavesurferRef.current.on("loading", (data) => {
        //   console.log("loading --> ", data);
        // });

        if (window) {
          // @ts-ignore
          window.surferidze = wavesurferRef.current;
        }
      }
    },
    [regionCreatedHandler]
  );

  // const generateRegion = useCallback(() => {
  //   if (!wavesurferRef.current) return;
  //   const minTimestampInSeconds = 0;
  //   const maxTimestampInSeconds = wavesurferRef.current.getDuration();
  //   const distance = generateNum(0, 10);
  //   const [min, max] = generateTwoNumsWithDistance(
  //     distance,
  //     minTimestampInSeconds,
  //     maxTimestampInSeconds
  //   );

  //   const r = generateNum(0, 255);
  //   const g = generateNum(0, 255);
  //   const b = generateNum(0, 255);

  //   setRegions([
  //     ...regions,
  //     {
  //       id: `custom-${generateNum(0, 9999)}`,
  //       start: min,
  //       end: max,
  //       color: `rgba(${r}, ${g}, ${b}, 0.5)`,
  //     },
  //   ]);
  // }, [regions, wavesurferRef]);

  // const generateMarker = useCallback(() => {
  //   if (!wavesurferRef.current) return;
  //   const minTimestampInSeconds = 0;
  //   const maxTimestampInSeconds = wavesurferRef.current.getDuration();
  //   const distance = generateNum(0, 10);
  //   const [min] = generateTwoNumsWithDistance(
  //     distance,
  //     minTimestampInSeconds,
  //     maxTimestampInSeconds
  //   );

  //   const r = generateNum(0, 255);
  //   const g = generateNum(0, 255);
  //   const b = generateNum(0, 255);

  //   setMarkers([
  //     ...markers,
  //     {
  //       label: `custom-${generateNum(0, 9999)}`,
  //       time: min,
  //       color: `rgba(${r}, ${g}, ${b}, 0.5)`,
  //     },
  //   ]);
  // }, [markers, wavesurferRef]);

  // const removeLastRegion = useCallback(() => {
  //   let nextRegions = [...regions];

  //   nextRegions.pop();

  //   setRegions(nextRegions);
  // }, [regions]);

  // const removeLastMarker = useCallback(() => {
  //   let nextMarkers = [...markers];

  //   nextMarkers.pop();

  //   setMarkers(nextMarkers);
  // }, [markers]);

  // const shuffleLastMarker = useCallback(() => {
  //   setMarkers((prev) => {
  //     const next = [...prev];
  //     let lastIndex = next.length - 1;

  //     const minTimestampInSeconds = 0;
  //     const maxTimestampInSeconds = wavesurferRef?.current?.getDuration() || 0;
  //     const distance = generateNum(0, 10);
  //     const [min] = generateTwoNumsWithDistance(
  //       distance,
  //       minTimestampInSeconds,
  //       maxTimestampInSeconds
  //     );

  //     next[lastIndex] = {
  //       ...next[lastIndex],
  //       time: min,
  //     };

  //     return next;
  //   });
  // }, []);

  const play = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  // const handleRegionUpdate = useCallback((region, smth) => {
  //   console.log("region-update-end --> region:", region);
  //   console.log(smth);
  // }, []);

  // const handleMarkerUpdate = useCallback((marker, smth) => {
  //   console.log("region-update-end --> marker:", marker);
  //   console.log(smth);
  // }, []);

  // const setZoom50 = () => {
  //   wavesurferRef.current?.zoom(50);
  // };

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 z-20">
      <div className="relative h-full -mt-7">
        <WaveSurfer
          // @ts-ignore
          plugins={plugins}
          // @ts-ignore
          onMount={handleWSMount}
          cursorColor="transparent"
          container="#waveform"
        >
          <WaveForm id="waveform">
            {/* {isLoaded &&
              regions.map((regionProps) => (
                <Region
                  // onUpdateEnd={handleRegionUpdate}
                  key={regionProps.id}
                  {...regionProps}
                />
              ))}
            {isLoaded &&
              markers.map((markerProps) => (
                <Marker
                  key={markerProps.id}
                  onUpdateEnd={handleMarkerUpdate}
                  start={markerProps.time}
                  color={markerProps.color}
                  content={markerProps.label}
                  drag={markerProps.draggable}
                />
              ))} */}
          </WaveForm>
          <div id="timeline" />
        </WaveSurfer>
        {/* <div>
        <button onClick={generateRegion}>Generate region</button>
        <button onClick={generateMarker}>Generte Marker</button>
        <button onClick={play}>Play / Pause</button>
        <button onClick={removeLastRegion}>Remove last region</button>
        <button onClick={removeLastMarker}>Remove last marker</button>
        <button onClick={shuffleLastMarker}>Shuffle last marker</button>
        <button onClick={toggleTimeline}>Toggle timeline</button>
        <button onClick={setZoom50}>zoom 50%</button>
      </div> */}
      </div>
    </div>
  );
}

export default AudioWave;
