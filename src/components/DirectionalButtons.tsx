import React from "react";
import {
  FaArrowUp,
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
} from "react-icons/fa";

function DirectionalButtons({
  moveLine,
  moveSide,
}: {
  moveLine: (direction: "up" | "down") => void;
  moveSide: (direction: "left" | "right") => void;
}) {
  return (
    <div className="flex justify-center items-center">
      <div className="grid grid-cols-3 grid-rows-3 gap-2 w-32 h-32">
        <div className="col-start-2 row-start-1 flex justify-center items-center">
          <button
            className="bg-green-900 text-white p-2 rounded-full hover:bg-green-700 transition-colors duration-300"
            onClick={() => moveLine("up")}
          >
            <FaArrowUp />
          </button>
        </div>
        <div className="col-start-1 row-start-2 flex justify-center items-center">
          <button
            className="bg-green-900 text-white p-2 rounded-full hover:bg-green-700 transition-colors duration-300"
            onClick={() => moveSide("left")}
          >
            <FaArrowLeft />
          </button>
        </div>
        <div className="col-start-3 row-start-2 flex justify-center items-center">
          <button
            className="bg-green-900 text-white p-2 rounded-full hover:bg-green-700 transition-colors duration-300"
            onClick={() => moveSide("right")}
          >
            <FaArrowRight />
          </button>
        </div>
        <div className="col-start-2 row-start-3 flex justify-center items-center">
          <button
            className="bg-green-900 text-white p-2 rounded-full hover:bg-green-700 transition-colors duration-300"
            onClick={() => moveLine("down")}
          >
            <FaArrowDown />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DirectionalButtons;
