import { Link, useLocation } from "wouter";
import { FC } from "react";

const NavBar: FC = () => {
  const [location] = useLocation();

  return (
    <nav className="flex justify-start space-x-4 p-4 bg-gray-800 text-white">
      <Link href="/" className={location === "/" ? "text-white" : ""}>
        Download
      </Link>
      <Link
        href="/editor"
        className={location === "/editor" ? "text-white" : ""}
      >
        Editor
      </Link>
    </nav>
  );
};

export default NavBar;
