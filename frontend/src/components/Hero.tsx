import { spriteDataUrl } from "../sprites/pixel";
import { appleSprite, bananaSprite, cloudSprite, flowerSprite, GROUND_TILE } from "../sprites/sprites";
import PixelSprite from "./PixelSprite";

const HERO_BANANA = bananaSprite("ripe");
const CLOUD = cloudSprite();
const APPLE = appleSprite();
const PINK_FLOWER = flowerSprite("#f9844a");
const WHITE_FLOWER = flowerSprite("#fff8e7");

export function Ground({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pixelated h-12 bg-repeat-x ${className}`}
      style={{ backgroundImage: spriteDataUrl(GROUND_TILE), backgroundSize: "64px 48px" }}
    />
  );
}

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-sky">
      <PixelSprite sprite={CLOUD} scale={5} className="absolute top-8 left-[6%] opacity-90" />
      <PixelSprite sprite={CLOUD} scale={3} className="absolute top-24 right-[8%] hidden sm:block" />
      <PixelSprite sprite={CLOUD} scale={4} className="absolute top-4 left-[52%] hidden lg:block" />

      <div className="relative mx-auto grid max-w-5xl items-end gap-6 px-4 pt-16 sm:px-6 md:grid-cols-[1.25fr_1fr]">
        <div className="pb-10 md:pb-24">
          <p className="px-badge bg-banana">Banana health check</p>
          <h1 className="mt-6 font-pixel text-lg leading-[1.7] uppercase sm:text-2xl sm:leading-[1.6]">
            How much life does your banana have left?
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
            Give your banana a checkup. Upload a photo and find out how much longer it has.
          </p>
          <div className="mt-9 flex flex-wrap gap-5">
            <a href="#checkup" className="px-btn px-btn-primary">
              ▶ Start checkup
            </a>
            <a href="#how" className="px-btn px-btn-plain">
              How it works
            </a>
          </div>
        </div>

        <div className="relative flex items-end justify-center gap-3 sm:gap-5">
          <PixelSprite sprite={PINK_FLOWER} scale={4} className="mb-0 hidden sm:block" />
          <div className="relative">
            <p className="px-panel absolute top-2 left-[78%] z-10 px-3 py-2 font-pixel text-[0.55rem] leading-none whitespace-nowrap">
              Check me!
            </p>
            <PixelSprite sprite={HERO_BANANA} scale={9} className="animate-bob h-auto w-36 sm:w-44" label="A smiling pixel-art banana" />
          </div>
          <PixelSprite sprite={APPLE} scale={4} />
          <PixelSprite sprite={WHITE_FLOWER} scale={4} className="hidden sm:block" />
        </div>
      </div>
      <Ground className="-mt-1" />
    </section>
  );
}
