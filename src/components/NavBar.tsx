import { Link, useLocation } from "wouter";
import { FC } from "react";
import { useStore } from "../store";

const NavBar: FC = () => {
  const [location] = useLocation();
  const { videoId } = useStore();

  return (
    <nav className="flex justify-center space-x-4 p-4 bg-gray-800  fixed top-0 w-full z-10">
      <Link href="/" className={location === "/" ? "" : "text-[#62729e]"}>
        1. DOWNLOAD
      </Link>
      <Link
        href="/trim"
        className={location === "/trim" ? "" : "text-[#62729e]"}
      >
        2. TRIM
      </Link>
      <Link
        href="/subtitles"
        className={location === "/subtitles" ? "" : "text-[#62729e]"}
      >
        3. SUBTITLES
      </Link>
    </nav>
  );
};

export default NavBar;
