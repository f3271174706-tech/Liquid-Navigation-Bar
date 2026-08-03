import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Boxes, Home, Layers3, RotateCcw, Sparkles, UserRound } from "lucide-react";
import { LiquidNav, type LiquidNavItem } from "./components/liquid-nav";
import { ElasticSlider } from "./components/elastic-slider";
import { MotionPresetNav } from "./components/motion-preset-nav";
import { SpecularButton } from "./components/specular-button";
import "./playground.css";

const items: LiquidNavItem[] = [
  { id: "lab-home", label: "首页", icon: Home },
  { id: "lab-work", label: "作品", icon: Layers3 },
  { id: "lab-motion", label: "动效", icon: Sparkles },
  { id: "lab-components", label: "组件", icon: Boxes },
  { id: "lab-about", label: "关于", icon: UserRound },
];

const defaults = {
  width: 662,
  height: 83,
  radius: 60,
  opacity: 13,
  blur: 12,
  saturation: 150,
  border: 10,
  refraction: 129,
  damping: 50,
};
type Values = typeof defaults;
type Key = keyof Values;
const controls: Array<[Key, string, number, number, string]> = [
  ["opacity", "背景不透明度", 4, 42, "%"],
  ["blur", "模糊", 0, 32, "px"],
  ["saturation", "饱和度", 80, 220, "%"],
  ["refraction", "折射色", 90, 170, "%"],
  ["width", "宽度", 520, 920, "px"],
  ["height", "高度", 56, 96, "px"],
  ["radius", "圆角", 18, 60, "px"],
  ["border", "边界可见度", 10, 100, "%"],
  ["damping", "阻尼感", 0, 100, "%"],
];

const slides = [
  ["lab-home", "01", "ice"],
  ["lab-work", "02", "violet"],
  ["lab-motion", "03", "coral"],
  ["lab-components", "04", "mint"],
  ["lab-about", "05", "amber"],
] as const;

const motionPresets = [
  { name: "流动", sequence: [0, 1, 2, 3, 4], interval: 620 },
  { name: "甩动", sequence: [0, 4, 1, 3, 2], interval: 560 },
  { name: "吸附", sequence: [0, 3, 1, 4, 2, 0], interval: 760 },
] as const;

const presetNavItems = motionPresets.map((preset, index) => ({
  id: `motion-preset-${index}`,
  label: preset.name,
}));

export function PlaygroundPage() {
  const [accent, setAccent] = useState("#ef6c4c");
  const [values, setValues] = useState(defaults);
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const timers = useRef<number[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activate = useCallback((index: number) => {
    document.querySelectorAll<HTMLButtonElement>(".playground-page .liquid-nav > .nav-items .nav-item")[index]?.click();
  }, []);

  const play = useCallback((sequence: readonly number[], interval: number) => {
    timers.current.forEach(window.clearTimeout);
    timers.current = sequence.map((index, step) => window.setTimeout(() => activate(index), step * interval));
  }, [activate]);

  const runPreset = useCallback((presetIndex: number) => {
    const preset = motionPresets[presetIndex];
    setActivePreset(presetIndex);
    play(preset.sequence, preset.interval);
  }, [play]);

  useEffect(() => {
    let previousPreset = -1;
    let automationTimer: number | null = null;

    const playRandomPreset = () => {
      let nextPreset = Math.floor(Math.random() * motionPresets.length);
      if (nextPreset === previousPreset) {
        nextPreset = (nextPreset + 1) % motionPresets.length;
      }
      previousPreset = nextPreset;
      runPreset(nextPreset);
    };

    const scheduleAutomation = (delay: number) => {
      if (automationTimer !== null) window.clearTimeout(automationTimer);
      automationTimer = window.setTimeout(() => {
        playRandomPreset();
        scheduleAutomation(15000);
      }, delay);
    };

    const onUserActivity = (event: Event) => {
      if (!event.isTrusted) return;
      if (event instanceof PointerEvent && event.type === "pointermove" && event.buttons === 0) return;

      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      scheduleAutomation(10000);
    };

    const playground = document.querySelector(".playground-page");
    const activityEvents = ["pointerdown", "pointermove", "wheel", "touchstart", "keydown", "input"];
    activityEvents.forEach((eventName) =>
      playground?.addEventListener(eventName, onUserActivity, { capture: true, passive: true }),
    );

    playRandomPreset();
    scheduleAutomation(15000);

    return () => {
      if (automationTimer !== null) window.clearTimeout(automationTimer);
      activityEvents.forEach((eventName) =>
        playground?.removeEventListener(eventName, onUserActivity, { capture: true }),
      );
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [runPreset]);

  const code = useMemo(() => `import { Boxes, Home, Layers3, Sparkles, UserRound } from "lucide-react";
import { LiquidNav, type LiquidNavItem } from "./components/liquid-nav";
import "./custom-liquid-nav.css";

const navigation: LiquidNavItem[] = [
  { id: "home", label: "首页", icon: Home },
  { id: "work", label: "作品", icon: Layers3 },
  { id: "motion", label: "动效", icon: Sparkles },
  { id: "components", label: "组件", icon: Boxes },
  { id: "about", label: "关于", icon: UserRound },
];

export function CustomizedNavigation() {
  return (
    <LiquidNav
      items={navigation}
      accentColor="${accent}"
      damping={${values.damping}}
      captionDuration={0}
      className="custom-liquid-nav"
    />
  );
}

/* custom-liquid-nav.css
   Load this after the component's liquid-nav.css. */
.custom-liquid-nav {
  width: min(${values.width}px, calc(100vw - 24px));
}

.custom-liquid-nav .liquid-nav {
  height: ${values.height}px;
  border-color: rgba(255, 255, 255, ${(values.border / 100).toFixed(2)});
  border-radius: ${values.radius}px;
  background: rgba(255, 255, 255, ${(values.opacity / 100).toFixed(2)});
  backdrop-filter: blur(${values.blur}px) saturate(${values.saturation}%);
  -webkit-backdrop-filter: blur(${values.blur}px) saturate(${values.saturation}%);
}

.custom-liquid-nav .nav-items--refracted {
  filter: url("#liquid-refract-rest") saturate(${values.refraction}%);
}`, [accent, values]);

  const style = {
    "--lab-width": `${values.width}px`, "--lab-height": `${values.height}px`,
    "--lab-radius": `${values.radius}px`, "--lab-opacity": values.opacity / 100,
    "--lab-blur": `${values.blur}px`, "--lab-saturation": `${values.saturation}%`,
    "--lab-border": values.border / 100, "--lab-refraction": `${values.refraction}%`,
  } as CSSProperties;

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main className="playground-page" style={style}>
      <header className="lab-header">
        <div className="lab-title"><span>Liquid Navigation Bar</span></div>
        <div className="lab-actions">
          <SpecularButton
            size="sm"
            radius={11}
            tint="#ffffff"
            tintOpacity={0.78}
            blur={14}
            textColor="#68707d"
            lineColor="#ffffff"
            baseColor="#8794a7"
            intensity={2.15}
            shineSize={18}
            shineFade={42}
            thickness={1.55}
            speed={0.18}
            proximity={220}
            autoAnimate
            onClick={() => { setValues(defaults); setAccent("#ef6c4c"); }}
          >
            <RotateCcw />重置
          </SpecularButton>
          <SpecularButton
            size="sm"
            radius={11}
            tint="#252932"
            tintOpacity={0.96}
            blur={12}
            textColor="#ffffff"
            lineColor="#ffffff"
            baseColor="#8794a7"
            intensity={2.45}
            shineSize={18}
            shineFade={40}
            thickness={1.7}
            speed={0.2}
            proximity={220}
            autoAnimate
            className="primary"
            onClick={copy}
          >
            {copied ? "已复制" : "复制代码"}
          </SpecularButton>
        </div>
      </header>

      <section className="lab-preview">
        <div className="lab-stage">
          <LiquidNav
            items={items}
            accentColor={accent}
            damping={values.damping}
            captionDuration={0}
            className="lab-nav"
            scrollContainerRef={scrollContainerRef}
          />
          <div className="lab-scroll bg-type" ref={scrollContainerRef}>
            {slides.map(([id, index, tone]) => (
              <section className={`lab-slide tone-${tone}`} id={id} key={id}>
                <div className="lab-grid" />
                <div className="lab-type">
                  <small>ZZPP / GALLERY / {index}</small>
                  <div className="lab-script-title">
                    <strong>ZZPP</strong>
                    <em>Gallery</em>
                  </div>
                  <span>Navigation Bar UI</span>
                </div>
                <div className="lab-cards"><i /><i /><i /></div>
                <span className="lab-slide-index">{index} / 05</span>
              </section>
            ))}
          </div>
          <MotionPresetNav
            items={presetNavItems}
            activeIndex={activePreset}
            accentColor={accent}
            parameters={values}
            onSelect={runPreset}
          />
        </div>
      </section>

      <section className="lab-customize">
        <div className="lab-heading">
          <div className="lab-heading__main">
            <h1>自定义实时参数</h1>
            <label className="lab-accent"><span>强调色</span><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} /><code>{accent.toUpperCase()}</code></label>
          </div>
          <p>所有参数都会实时作用于上方真实组件。</p>
        </div>
        <div className="lab-controls">
          {controls.map(([key, label, min, max, unit]) => (
            <label className="lab-range" key={key}>
              <span>{label}</span>
              <ElasticSlider
                value={values[key]}
                startingValue={min}
                maxValue={max}
                isStepped
                stepSize={1}
                ariaLabel={label}
                onChange={(value) => setValues((current) => ({ ...current, [key]: value }))}
              />
              <output>{values[key]}{unit}</output>
            </label>
          ))}
        </div>
      </section>
    </main>
  );
}
