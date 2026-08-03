import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import "./elastic-slider.css";

const MAX_OVERFLOW = 68;

export interface ElasticSliderProps {
  value?: number;
  defaultValue?: number;
  startingValue?: number;
  maxValue?: number;
  className?: string;
  isStepped?: boolean;
  stepSize?: number;
  ariaLabel?: string;
  onChange?: (value: number) => void;
}

export function ElasticSlider({
  value: controlledValue,
  defaultValue = 50,
  startingValue = 0,
  maxValue = 100,
  className = "",
  isStepped = false,
  stepSize = 1,
  ariaLabel = "参数值",
  onChange,
}: ElasticSliderProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [dragging, setDragging] = useState(false);
  const value = controlledValue ?? internalValue;
  const sliderRef = useRef<HTMLDivElement>(null);
  const clientX = useMotionValue(0);
  const overflow = useMotionValue(0);
  const scale = useMotionValue(1);
  const opacity = useTransform(scale, [1, 1.32], [0.96, 1]);
  const trackHeight = useTransform(scale, [1, 1.32], [6, 10]);
  const trackMargin = useTransform(scale, [1, 1.32], [0, -2.5]);
  const trackScaleX = useTransform(() => {
    const width = sliderRef.current?.getBoundingClientRect().width ?? 1;
    return 1 + overflow.get() / width;
  });
  const trackScaleY = useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.82]);
  const transformOrigin = useTransform(() => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return "center";
    return clientX.get() < rect.left + rect.width / 2 ? "right" : "left";
  });

  useEffect(() => {
    if (controlledValue === undefined) setInternalValue(defaultValue);
  }, [controlledValue, defaultValue]);

  useMotionValueEvent(clientX, "change", (latest) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (latest < rect.left) {
      overflow.jump(decay(rect.left - latest, MAX_OVERFLOW));
    } else if (latest > rect.right) {
      overflow.jump(decay(latest - rect.right, MAX_OVERFLOW));
    } else {
      overflow.jump(0);
    }
  });

  const commitValue = (nextValue: number) => {
    const stepped = isStepped
      ? Math.round((nextValue - startingValue) / stepSize) * stepSize + startingValue
      : nextValue;
    const clamped = Math.min(Math.max(stepped, startingValue), maxValue);
    if (controlledValue === undefined) setInternalValue(clamped);
    onChange?.(clamped);
  };

  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect || event.buttons === 0) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    commitValue(startingValue + ratio * (maxValue - startingValue));
    clientX.jump(event.clientX);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    animate(scale, 1.32, { type: "spring", stiffness: 360, damping: 24 });
    updateFromPointer(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const release = () => {
    setDragging(false);
    animate(overflow, 0, { type: "spring", bounce: 0.48 });
    animate(scale, 1, { type: "spring", bounce: 0.25 });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    commitValue(value + (event.key === "ArrowRight" ? stepSize : -stepSize));
  };

  const percentage =
    maxValue === startingValue
      ? 0
      : ((value - startingValue) / (maxValue - startingValue)) * 100;

  return (
    <div className={`elastic-slider${className ? ` ${className}` : ""}`}>
      <motion.div
        className={`elastic-slider__wrapper${dragging ? " is-dragging" : ""}`}
        style={{ opacity }}
        onHoverStart={() => !dragging && animate(scale, 1.12)}
        onHoverEnd={() => !dragging && animate(scale, 1)}
        onTouchStart={() => !dragging && animate(scale, 1.12)}
        onTouchEnd={() => !dragging && animate(scale, 1)}
      >
        <div
          ref={sliderRef}
          className="elastic-slider__root"
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={startingValue}
          aria-valuemax={maxValue}
          aria-valuenow={Math.round(value)}
          onKeyDown={handleKeyDown}
          onPointerMove={updateFromPointer}
          onPointerDown={handlePointerDown}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          <div className="elastic-slider__meteors" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
          </div>
          <motion.div
            className="elastic-slider__track-wrapper"
            style={{
              height: trackHeight,
              marginTop: trackMargin,
              marginBottom: trackMargin,
              scaleX: trackScaleX,
              scaleY: trackScaleY,
              transformOrigin,
            }}
          >
            <div className="elastic-slider__track">
              <div
                className="elastic-slider__range"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function decay(value: number, max: number) {
  if (max === 0) return 0;
  const entry = value / max;
  return 2 * (1 / (1 + Math.exp(-entry)) - 0.5) * max;
}
