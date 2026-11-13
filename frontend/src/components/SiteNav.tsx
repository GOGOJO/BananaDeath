import { bananaSprite } from "../sprites/sprites";
import PixelSprite from "./PixelSprite";

export const GITHUB_URL = "https://github.com/GOGOJO/BananaDeath";

const LOGO = bananaSprite("ripe");

const linkClass =
  "block px-2 py-2 font-pixel text-[0.55rem] leading-none uppercase sm:px-3 sm:text-[0.6rem] hover:bg-banana hover:shadow-[0_-2px_0_0_#3b3024,0_2px_0_0_#3b3024,-2px_0_0_0_#3b3024,2px_0_0_0_#3b3024]";

export default function SiteNav() {
  return (
    <header className="border-b-4 border-ink bg-paper">
      <nav aria-label="Main" className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="#top" className="flex items-center gap-2 sm:gap-3">
          <PixelSprite sprite={LOGO} scale={1.25} className="shrink-0" />
          <span className="font-pixel text-[0.6rem] leading-none sm:text-xs">Banana Death</span>
        </a>
        <ul className="flex items-center gap-1 sm:gap-2">
          <li>
            <a href="#top" className={linkClass}>
              Home
            </a>
          </li>
          <li>
            <a href="#how" className={linkClass}>
              <span className="sm:hidden">About</span>
              <span className="hidden sm:inline">How it works</span>
            </a>
          </li>
          <li>
            <a href={GITHUB_URL} className={linkClass}>
              GitHub
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
