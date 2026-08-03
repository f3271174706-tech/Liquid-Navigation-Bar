import { motion } from "motion/react";
import type { CSSProperties } from "react";
import "./motion-preset-nav.css";

export type MotionPresetNavItem = {
  id: string;
  label: string;
};

export type MotionPresetParameters = {
  width: number;
  height: number;
  radius: number;
  opacity: number;
  blur: number;
  saturation: number;
  border: number;
  refraction: number;
  damping: number;
};

type MotionPresetNavProps = {
  items: readonly MotionPresetNavItem[];
  activeIndex: number;
  accentColor?: string;
  parameters: MotionPresetParameters;
  onSelect: (index: number) => void;
};

export function MotionPresetNav({ items, activeIndex, accentColor = "#ef6c4c", parameters, onSelect }: MotionPresetNavProps) {
  const miniWidth = Math.max(150, Math.round(parameters.width * 0.26));
  const miniHeight = Math.max(40, Math.round(parameters.height * 0.55));
  const miniRadius = Math.min(miniHeight / 2, Math.max(9, parameters.radius * 0.38));
  const dampingValue = Math.max(0, Math.min(100, parameters.damping));
  const lensTransition = {
    type: "spring" as const,
    stiffness: 250 - dampingValue * 1.6,
    damping: 10 + dampingValue * 0.1,
    mass: 0.58 + dampingValue * 0.004,
  };
  const style = {
    "--liquid-nav-accent": accentColor,
    "--mini-nav-width": `${miniWidth}px`,
    "--mini-nav-height": `${miniHeight}px`,
    "--mini-nav-radius": `${miniRadius}px`,
    "--mini-nav-opacity": parameters.opacity / 100,
    "--mini-nav-blur": `${parameters.blur}px`,
    "--mini-nav-saturation": `${parameters.saturation}%`,
    "--mini-nav-border": 0,
    "--mini-nav-refraction": `${parameters.refraction}%`,
  } as CSSProperties;

  return (
    <nav
      className="motion-preset-nav"
      aria-label="动作预设"
      style={style}
    >
      <div className="motion-preset-nav__items">
        {items.map((item, index) => {
          const active = index === activeIndex;
          return (
            <button
              className={active ? "is-active" : ""}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(index)}
              key={item.id}
            >
              {active && (
                <motion.span
                  className="motion-preset-nav__lens"
                  layoutId="motion-preset-liquid-lens"
                  initial={false}
                  transition={lensTransition}
                />
              )}
              <span className="motion-preset-nav__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
