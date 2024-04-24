import { Link, useLocation } from "wouter";
import { FC, useState } from "react";
import { useStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { FaRegTrashCan } from "react-icons/fa6";
import { AiOutlineLoading } from "react-icons/ai";
import { Tooltip } from 'react-tooltip'


const NavBar: FC = () => {
  const [location, setLocation] = useLocation();
  const { videoId } = useStore();
  const [loading, setLoading] = useState(false);

  async function cleanFiles() {
    setLoading(true);
    await invoke("clean_files", { videoId });
    setLoading(false);
    setLocation("/");
  } 

  return (
    <nav className="flex justify-center space-x-4 p-4 bg-gray-800  fixed top-0 w-full z-10 relative align-center">
      <Link href="/" className={location === "/" ? "" : "text-[#62729e]"} data-tip="Download">
        1. DOWNLOAD
      </Link>
      <Link
        href="/trim"
        className={location === "/trim" ? "" : "text-[#62729e]"}
        data-tooltip-content="Trim"
        data-tooltip-id="trim"
      >
        2. TRIM
      </Link>
      <Link
        href="/subtitles"
        className={location === "/subtitles" ? "" : "text-[#62729e]"}
        data-tooltip-content="Subtitles"
        data-tooltip-id="subtitles"
      >
        3. SUBTITLES
      </Link>
      <button
        disabled={loading}
        className="absolute right-4 top-4"
        onClick={cleanFiles}
        data-tooltip-content={loading ? "Loading..." : "Clean all files from the current video"}
        data-tooltip-id="clean"
      >
        {loading ? <AiOutlineLoading className="animate-spin" /> : <FaRegTrashCan />}
      </button>
      <Tooltip id="clean" />
      <Tooltip id="trim" />
      <Tooltip id="subtitles" />
    </nav>
  );
};

export default NavBar;
