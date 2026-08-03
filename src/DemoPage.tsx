import { useCallback, useEffect, useRef, useState } from "react";
import { Boxes, Home, Layers3, Sparkles, UserRound } from "lucide-react";
import { LiquidNav, type LiquidNavItem } from "./components/liquid-nav";
import "./demo.css";

const demoNavigation: LiquidNavItem[] = [
  { id: "demo-home", label: "首页", icon: Home },
  { id: "demo-work", label: "作品", icon: Layers3 },
  { id: "demo-motion", label: "动效", icon: Sparkles },
  { id: "demo-components", label: "组件", icon: Boxes },
  { id: "demo-about", label: "关于", icon: UserRound },
];

const scenes = [
  { id: "demo-home", word: "LIQUID", index: "01", tone: "ice" },
  { id: "demo-work", word: "FLOW", index: "02", tone: "violet" },
  { id: "demo-motion", word: "REFRACT", index: "03", tone: "coral" },
  { id: "demo-components", word: "SNAP", index: "04", tone: "aqua" },
  { id: "demo-about", word: "FZP", index: "05", tone: "amber" },
];

const AUTO_SEQUENCE = [
  { at: 900, index: 1 },
  { at: 2900, index: 3 },
  { at: 4900, index: 0 },
  { at: 7000, index: 4 },
  { at: 9300, index: 2 },
  { at: 11800, index: 0 },
];

export function DemoPage() {
  const [running, setRunning] = useState(false);
  const [clean, setClean] = useState(
    () => new URLSearchParams(window.location.search).has("clean"),
  );
  const [progress, setProgress] = useState(0);
  const timersRef = useRef<number[]>([]);
  const startTimeRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const stopAuto = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setRunning(false);
    setProgress(0);
  }, []);

  const activate = useCallback((index: number) => {
    const buttons = document.querySelectorAll<HTMLButtonElement>(
      ".promo-demo .liquid-nav > .nav-items .nav-item",
    );
    buttons[index]?.click();
  }, []);

  const startAuto = useCallback(() => {
    stopAuto();
    window.scrollTo({ top: 0, behavior: "auto" });
    activate(0);
    setRunning(true);
    setClean(true);
    startTimeRef.current = performance.now();

    AUTO_SEQUENCE.forEach(({ at, index }) => {
      timersRef.current.push(
        window.setTimeout(() => activate(index), at),
      );
    });

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      setProgress(Math.min(1, elapsed / 15000));
      if (elapsed < 15000) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setRunning(false);
        frameRef.current = null;
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [activate, stopAuto]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        startAuto();
      }
      if (event.key.toLowerCase() === "c") setClean((value) => !value);
      if (event.key === "Escape") {
        stopAuto();
        setClean(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      timersRef.current.forEach(window.clearTimeout);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [startAuto, stopAuto]);

  return (
    <main className={`promo-demo${clean ? " is-clean" : ""}`}>
      <div className="demo-noise" aria-hidden="true" />
      <div className="demo-brand" aria-hidden="true">
        FZP / LIQUID UI
      </div>

      <LiquidNav
        items={demoNavigation}
        className="promo-liquid-nav"
        captionDuration={0}
      />

      {scenes.map((scene) => (
        <section
          id={scene.id}
          className={`promo-scene promo-scene--${scene.tone}`}
          key={scene.id}
        >
          <div className="demo-orb demo-orb--left" />
          <div className="demo-orb demo-orb--right" />
          <div className="scene-index">{scene.index}</div>
          <div className="scene-word" aria-hidden="true">
            {scene.word}
          </div>
          <div className="scene-cross scene-cross--top">+</div>
          <div className="scene-cross scene-cross--bottom">+</div>
        </section>
      ))}

      <div className="demo-controls">
        <button type="button" onClick={startAuto} disabled={running}>
          <span className="control-dot" />
          {running ? "PLAYING 15S" : "AUTO 15S"}
        </button>
        <button type="button" onClick={() => setClean(true)}>
          CLEAN VIEW
        </button>
        <span>SPACE 播放 · C 隐藏 · ESC 退出</span>
      </div>

      <div className={`demo-progress${running ? " is-visible" : ""}`}>
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      {clean && !running && (
        <button
          className="clean-exit"
          type="button"
          onClick={() => setClean(false)}
          aria-label="退出纯净模式"
        />
      )}
    </main>
  );
}
