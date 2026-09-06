"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Flash = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  echoWidth: number;
  echoHeight: number;
  intensity: number;
};

const randomBetween = (minimum: number, maximum: number) => minimum + Math.random() * (maximum - minimum);

/** A deliberately rare, background-only storm flash for cloud scenes. */
export function CloudLightning() {
  const [flashes, setFlashes] = useState<Flash[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: number | undefined;
    let clearTimer: number | undefined;
    let followUpTimer: number | undefined;
    let identifier = 0;

    const flash = () => {
      const makeFlash = (x?: number): Flash => {
        identifier += 1;
        // Nearby lightning exposes a broad portion of the cloud layer. Distant
        // lightning is a smaller, quieter lift deeper in the sky.
        const nearby = Math.random() < 0.34;
        const width = nearby ? randomBetween(58, 105) : randomBetween(20, 42);
        const height = nearby ? randomBetween(48, 84) : randomBetween(20, 37);
        return {
          id: identifier,
          x: x ?? randomBetween(-4, 104),
          y: nearby ? randomBetween(22, 61) : randomBetween(7, 48),
          width,
          height,
          echoWidth: width * randomBetween(0.42, 0.64),
          echoHeight: height * randomBetween(0.48, 0.7),
          intensity: nearby ? randomBetween(0.27, 0.46) : randomBetween(0.12, 0.25),
        };
      };

      const doubleFlash = Math.random() < 0.22;
      setFlashes(doubleFlash
        ? [makeFlash(randomBetween(-3, 28)), makeFlash(randomBetween(72, 103))]
        : [makeFlash()]);
      window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(() => setFlashes([]), randomBetween(90, 155));

      // A rare echo makes the scene feel weather-driven, without becoming busy.
      if (Math.random() < 0.18) {
        followUpTimer = window.setTimeout(() => {
          setFlashes([makeFlash()]);
          window.clearTimeout(clearTimer);
          clearTimer = window.setTimeout(() => setFlashes([]), randomBetween(70, 120));
        }, randomBetween(260, 420));
      }
      // Keep the sky quiet: roughly one event every 14–30 seconds.
      timer = window.setTimeout(flash, randomBetween(14000, 30000));
    };

    timer = window.setTimeout(flash, randomBetween(5500, 10500));
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
      window.clearTimeout(followUpTimer);
    };
  }, []);

  return (
    <span className="mk-cloud-lightning" aria-hidden="true">
      {flashes.map((flash) => (
        <span
          key={flash.id}
          className="mk-cloud-lightning__flash"
          style={{
            "--quire-flash-x": `${flash.x}%`,
            "--quire-flash-y": `${flash.y}%`,
            "--quire-flash-width": `${flash.width}%`,
            "--quire-flash-height": `${flash.height}%`,
            "--quire-flash-echo-width": `${flash.echoWidth}%`,
            "--quire-flash-echo-height": `${flash.echoHeight}%`,
            "--quire-flash-opacity": String(flash.intensity),
          } as CSSProperties}
        />
      ))}
    </span>
  );
}
