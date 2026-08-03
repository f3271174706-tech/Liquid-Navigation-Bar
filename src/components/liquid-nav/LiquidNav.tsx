import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
  type MotionStyle,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { LucideIcon } from "lucide-react";
import "./liquid-nav.css";

export interface LiquidNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface LiquidNavProps {
  items: LiquidNavItem[];
  accentColor?: string;
  damping?: number;
  captionDuration?: number;
  className?: string;
  ariaLabel?: string;
  onActiveChange?: (item: LiquidNavItem, index: number) => void;
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

const TRACK_PADDING = 6;

export function LiquidNav({
  items,
  accentColor = "#ef6c4c",
  damping = 50,
  captionDuration = 2500,
  className = "",
  ariaLabel = "页面导航",
  onActiveChange,
  scrollContainerRef,
}: LiquidNavProps) {
  const trackRef = useRef<HTMLElement>(null);
  const dragRef = useRef({
    pointerId: -1,
    grabOffset: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  });
  const activeRef = useRef(0);
  const draggingRef = useRef(false);
  const navigationLockedRef = useRef(false);
  const navigationTimerRef = useRef<number | null>(null);
  const movingRef = useRef(false);
  const movingTimerRef = useRef<number | null>(null);
  const impactTimerRef = useRef<number | null>(null);
  const syncPageFromLensRef = useRef(false);
  const pageSyncMotionRef = useRef<{
    targetLeft: number;
    lastLeft: number;
    direction: -1 | 0 | 1;
  } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [moving, setMoving] = useState(false);
  const [showCaption, setShowCaption] = useState(true);
  const [geometry, setGeometry] = useState({ width: 0, slot: 0 });
  const reduceMotion = useReducedMotion();
  const dampingValue = Math.max(0, Math.min(100, damping));
  const positionStiffness = 250 - dampingValue * 1.6;
  const positionDamping = 10 + dampingValue * 0.1;
  const positionMass = 0.58 + dampingValue * 0.004;

  const lensLeftTarget = useMotionValue(TRACK_PADDING);
  const lensWidthTarget = useMotionValue(0);
  const chromaTarget = useMotionValue(0);
  const impactScale = useMotionValue(1);
  const lensLeft = useSpring(lensLeftTarget, {
    stiffness: positionStiffness,
    damping: positionDamping,
    mass: positionMass,
  });
  const lensWidth = useSpring(lensWidthTarget, {
    stiffness: 420,
    damping: 38,
    mass: 0.6,
  });
  const chromaShift = useSpring(chromaTarget, {
    stiffness: 360,
    damping: 32,
    mass: 0.45,
  });
  const lensVelocity = useVelocity(lensLeft);
  const velocityStretch = useTransform(
    lensVelocity,
    (velocity) => 1 + Math.min(0.38, Math.abs(velocity) / 1750),
  );
  const shapeScaleX = useTransform(
    [velocityStretch, impactScale],
    ([stretch, impact]) => Number(stretch) * Number(impact),
  );
  const lensScaleX = shapeScaleX;
  const lensScaleY = useTransform(shapeScaleX, (scaleX) => 1 / scaleX);
  const lensContentX = useTransform(lensLeft, (value) => -value);
  const chromaShiftPx = useTransform(chromaShift, (value) => `${value}px`);
  const chromaBlue = useTransform(chromaShift, (value) => `${value * -0.45}px`);
  const chromaRed = useTransform(chromaShift, (value) => `${value * 0.45}px`);
  const flowShift = useTransform(
    lensVelocity,
    (velocity) => `${Math.max(-12, Math.min(12, velocity / 190))}px`,
  );

  const syncScrollFromLens = useCallback((left: number) => {
    if (geometry.slot === 0) return;
    const continuousIndex = Math.max(
      0,
      Math.min(items.length - 1, (left - TRACK_PADDING) / geometry.slot),
    );
    const lowerIndex = Math.floor(continuousIndex);
    const upperIndex = Math.min(items.length - 1, Math.ceil(continuousIndex));
    const progress = continuousIndex - lowerIndex;
    const lowerSection = document.getElementById(items[lowerIndex].id);
    const upperSection = document.getElementById(items[upperIndex].id);
    if (!lowerSection || !upperSection) return;

    const scrollContainer = scrollContainerRef?.current;
    const currentScroll = scrollContainer?.scrollTop ?? window.scrollY;
    const containerTop = scrollContainer?.getBoundingClientRect().top ?? 0;
    const lowerTop = currentScroll + lowerSection.getBoundingClientRect().top - containerTop;
    const upperTop = currentScroll + upperSection.getBoundingClientRect().top - containerTop;
    const targetScroll = lowerTop + (upperTop - lowerTop) * progress;

    if (scrollContainer) scrollContainer.scrollTop = targetScroll;
    else window.scrollTo(0, targetScroll);
  }, [geometry.slot, items, scrollContainerRef]);

  useMotionValueEvent(lensLeft, "change", (left) => {
    if (!syncPageFromLensRef.current) return;

    // Direct dragging must remain fully reversible and respond every frame.
    if (draggingRef.current) {
      syncScrollFromLens(left);
      return;
    }

    // A spring can overshoot its destination. Keep that visual bounce on the
    // lens, but never feed its reverse motion back into the page scroll.
    const motion = pageSyncMotionRef.current;
    if (!motion) {
      syncScrollFromLens(left);
      return;
    }

    const reachedTarget =
      motion.direction === 0 ||
      (motion.direction > 0
        ? left >= motion.targetLeft
        : left <= motion.targetLeft);

    if (reachedTarget) {
      syncScrollFromLens(motion.targetLeft);
      pageSyncMotionRef.current = null;
      syncPageFromLensRef.current = false;
      navigationLockedRef.current = false;
      return;
    }

    const stableLeft =
      motion.direction > 0
        ? Math.max(motion.lastLeft, Math.min(left, motion.targetLeft))
        : Math.min(motion.lastLeft, Math.max(left, motion.targetLeft));

    if (stableLeft !== motion.lastLeft) {
      motion.lastLeft = stableLeft;
      syncScrollFromLens(stableLeft);
    }
  });

  useMotionValueEvent(lensVelocity, "change", (velocity) => {
    const speed = Math.abs(velocity);

    if (speed > 2) {
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
        navigationTimerRef.current = null;
      }
    } else if (
      syncPageFromLensRef.current &&
      !draggingRef.current &&
      navigationTimerRef.current === null
    ) {
      navigationTimerRef.current = window.setTimeout(() => {
        if (pageSyncMotionRef.current) {
          syncScrollFromLens(pageSyncMotionRef.current.targetLeft);
          pageSyncMotionRef.current = null;
        }
        navigationLockedRef.current = false;
        syncPageFromLensRef.current = false;
        navigationTimerRef.current = null;
      }, 90);
    }

    if (speed > 18) {
      if (!movingRef.current) {
        movingRef.current = true;
        setMoving(true);
      }
      if (movingTimerRef.current !== null) {
        window.clearTimeout(movingTimerRef.current);
        movingTimerRef.current = null;
      }
    } else if (movingRef.current && movingTimerRef.current === null) {
      movingTimerRef.current = window.setTimeout(() => {
        movingRef.current = false;
        movingTimerRef.current = null;
        setMoving(false);
      }, 110);
    }

  });

  const setActive = useCallback(
    (index: number, scroll = false) => {
      const next = Math.max(0, Math.min(items.length - 1, index));
      syncPageFromLensRef.current = scroll;
      activeRef.current = next;
      setActiveIndex(next);
      onActiveChange?.(items[next], next);

      const left = TRACK_PADDING + geometry.slot * next;
      const currentLeft = lensLeft.get();
      const distance = Math.abs(left - lensLeft.get());
      const suppressPageBounce = next === 0 || next === items.length - 1;
      pageSyncMotionRef.current = scroll && suppressPageBounce
        ? {
            targetLeft: left,
            lastLeft: currentLeft,
            direction: Math.sign(left - currentLeft) as -1 | 0 | 1,
          }
        : null;
      lensLeftTarget.set(left);
      lensWidthTarget.set(geometry.slot);
      chromaTarget.set(0);

      if (impactTimerRef.current !== null) {
        window.clearTimeout(impactTimerRef.current);
        impactTimerRef.current = null;
      }
      if (!reduceMotion && distance > 1) {
        const impactDelay = Math.min(230, 140 + distance * 0.09);
        impactTimerRef.current = window.setTimeout(() => {
          impactScale.jump(0.64);
          animate(impactScale, 1, {
            type: "spring",
            stiffness: 260 - dampingValue * 1.6,
            damping: 6 + dampingValue * 0.1,
            mass: 0.55 + dampingValue * 0.002,
          });
          impactTimerRef.current = null;
        }, impactDelay);
      }

      if (reduceMotion) {
        lensLeft.jump(left);
        lensWidth.jump(geometry.slot);
        chromaShift.jump(0);
      }

      if (scroll) {
        navigationLockedRef.current = true;
        if (navigationTimerRef.current !== null) {
          window.clearTimeout(navigationTimerRef.current);
          navigationTimerRef.current = null;
        }

        if (reduceMotion || distance <= 1) {
          syncScrollFromLens(left);
          pageSyncMotionRef.current = null;
          navigationLockedRef.current = false;
          syncPageFromLensRef.current = false;
        }
      }
    },
    [
      chromaShift,
      chromaTarget,
      geometry.slot,
      impactScale,
      items,
      lensLeft,
      lensLeftTarget,
      lensWidth,
      lensWidthTarget,
      onActiveChange,
      dampingValue,
      reduceMotion,
      scrollContainerRef,
      syncScrollFromLens,
    ],
  );

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const width = track.getBoundingClientRect().width;
      const slot = (width - TRACK_PADDING * 2) / items.length;
      setGeometry({ width, slot });
      const left = TRACK_PADDING + slot * activeRef.current;
      lensLeftTarget.set(left);
      lensWidthTarget.set(slot);
      lensLeft.jump(left);
      lensWidth.jump(slot);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [
    items.length,
    lensLeft,
    lensLeftTarget,
    lensWidth,
    lensWidthTarget,
  ]);

  useEffect(() => {
    const releaseNavigationLock = () => {
      navigationLockedRef.current = false;
      syncPageFromLensRef.current = false;
      pageSyncMotionRef.current = null;
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
        navigationTimerRef.current = null;
      }
    };

    window.addEventListener("wheel", releaseNavigationLock, { passive: true });
    window.addEventListener("touchstart", releaseNavigationLock, {
      passive: true,
    });

    return () => {
      window.removeEventListener("wheel", releaseNavigationLock);
      window.removeEventListener("touchstart", releaseNavigationLock);
      releaseNavigationLock();
    };
  }, []);

  useEffect(
    () => () => {
      if (movingTimerRef.current !== null) {
        window.clearTimeout(movingTimerRef.current);
      }
      if (impactTimerRef.current !== null) {
        window.clearTimeout(impactTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (captionDuration <= 0) {
      setShowCaption(false);
      return;
    }
    setShowCaption(true);
    const timer = window.setTimeout(
      () => setShowCaption(false),
      captionDuration,
    );
    return () => window.clearTimeout(timer);
  }, [captionDuration]);

  useEffect(() => {
    const updateFromScroll = () => {
      if (dragging || navigationLockedRef.current) return;
      const scrollContainer = scrollContainerRef?.current;
      const marker = scrollContainer
        ? scrollContainer.getBoundingClientRect().top + scrollContainer.clientHeight * 0.42
        : window.scrollY + window.innerHeight * 0.42;
      let next = 0;
      items.forEach((item, index) => {
        const section = document.getElementById(item.id);
        const sectionTop = scrollContainer
          ? section?.getBoundingClientRect().top
          : section?.offsetTop;
        if (sectionTop !== undefined && sectionTop <= marker) next = index;
      });
      if (next !== activeRef.current) setActive(next);
    };

    updateFromScroll();
    const scrollTarget = scrollContainerRef?.current ?? window;
    scrollTarget.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", updateFromScroll);
    return () => {
      scrollTarget.removeEventListener("scroll", updateFromScroll);
      window.removeEventListener("resize", updateFromScroll);
    };
  }, [dragging, items, scrollContainerRef, setActive]);

  const updateDrag = (clientX: number, timeStamp: number) => {
    const track = trackRef.current;
    if (!track || geometry.slot === 0) return;

    const rect = track.getBoundingClientRect();
    const localX = clientX - rect.left;
    const elapsed = Math.max(8, timeStamp - dragRef.current.lastTime);
    const delta = localX - dragRef.current.lastX;
    const velocity = (delta / elapsed) * 1000;
    dragRef.current.velocity =
      dragRef.current.velocity * 0.78 + velocity * 0.22;
    dragRef.current.lastX = localX;
    dragRef.current.lastTime = timeStamp;

    const direction = Math.sign(dragRef.current.velocity || delta);
    const width = geometry.slot;
    const desiredLeft = localX - dragRef.current.grabOffset;
    const minLeft = TRACK_PADDING;
    const maxLeft = geometry.width - TRACK_PADDING - width;
    const left = Math.max(minLeft, Math.min(maxLeft, desiredLeft));

    lensLeftTarget.set(left);
    lensWidthTarget.set(geometry.slot);
    chromaTarget.set(
      reduceMotion
        ? 0
        : direction *
            Math.min(11, 2.5 + Math.abs(dragRef.current.velocity) * 0.006),
    );

    const center = left + width / 2 - TRACK_PADDING;
    const previewIndex = Math.max(
      0,
      Math.min(items.length - 1, Math.round(center / geometry.slot - 0.5)),
    );
    if (previewIndex !== activeRef.current) {
      activeRef.current = previewIndex;
      setActiveIndex(previewIndex);
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (geometry.slot === 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    navigationLockedRef.current = true;
    syncPageFromLensRef.current = true;
    pageSyncMotionRef.current = null;
    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }
    const trackRect = trackRef.current!.getBoundingClientRect();
    const currentLeft = lensLeft.get();
    lensLeftTarget.jump(currentLeft);
    lensLeft.jump(currentLeft);
    dragRef.current = {
      pointerId: event.pointerId,
      grabOffset: event.clientX - trackRect.left - currentLeft,
      lastX: event.clientX - trackRect.left,
      lastTime: event.timeStamp,
      velocity: 0,
    };
    if (impactTimerRef.current !== null) {
      window.clearTimeout(impactTimerRef.current);
      impactTimerRef.current = null;
      impactScale.jump(1);
    }
    setDragging(true);
    lensWidthTarget.set(geometry.slot);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || dragRef.current.pointerId !== event.pointerId) return;
    updateDrag(event.clientX, event.timeStamp);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || dragRef.current.pointerId !== event.pointerId) return;
    draggingRef.current = false;
    setDragging(false);
    const projectedCenter =
      lensLeftTarget.get() +
      lensWidthTarget.get() / 2 -
      TRACK_PADDING;
    const target = Math.round(projectedCenter / geometry.slot - 0.5);
    setActive(target, true);
  };

  const renderItems = (refracted = false) => (
    <div
      className={`nav-items${refracted ? " nav-items--refracted" : ""}`}
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            className={`nav-item${index === activeIndex ? " is-active" : ""}`}
            key={item.id}
            type="button"
            tabIndex={refracted ? -1 : 0}
            aria-hidden={refracted || undefined}
            aria-current={!refracted && index === activeIndex ? "page" : undefined}
            onClick={
              refracted
                ? undefined
                : () => {
                    setActive(index, true);
                  }
            }
          >
            <Icon aria-hidden="true" strokeWidth={1.9} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <header
      className={`fzp-liquid-nav-shell${className ? ` ${className}` : ""}`}
      style={{ "--liquid-nav-accent": accentColor } as CSSProperties}
    >
      <nav
        ref={trackRef}
        className="liquid-nav"
        aria-label={ariaLabel}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setActive(activeRef.current - 1, true);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            setActive(activeRef.current + 1, true);
          }
        }}
      >
        <svg className="optical-filters" aria-hidden="true">
          <defs>
            <filter
              id="liquid-refract-rest"
              x="-12%"
              y="-22%"
              width="124%"
              height="144%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.008 0.05"
                numOctaves="1"
                seed="9"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="2.5"
                xChannelSelector="R"
                yChannelSelector="B"
              />
            </filter>
            <filter
              id="liquid-refract-drag"
              x="-18%"
              y="-30%"
              width="136%"
              height="160%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.012 0.045"
                numOctaves="1"
                seed="13"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="7"
                xChannelSelector="R"
                yChannelSelector="B"
              />
            </filter>
          </defs>
        </svg>
        <div className="track-liquid-layer" aria-hidden="true" />
        {renderItems()}

        <motion.div
          className={`liquid-lens${dragging ? " is-dragging" : ""}${
            moving ? " is-moving" : ""
          }`}
          style={{
            x: lensLeft,
            width: lensWidth,
            scaleX: lensScaleX,
            scaleY: lensScaleY,
            "--chroma-shift": chromaShiftPx,
            "--chroma-blue": chromaBlue,
            "--chroma-red": chromaRed,
            "--flow-shift": flowShift,
          } as unknown as MotionStyle}
          role="slider"
          aria-label="拖动切换导航"
          aria-valuemin={1}
          aria-valuemax={items.length}
          aria-valuenow={activeIndex + 1}
          aria-valuetext={items[activeIndex]?.label}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div className="lens-glare" />
          <motion.div
            className="lens-content"
            style={{ x: lensContentX, width: geometry.width }}
          >
            {renderItems(true)}
          </motion.div>
        </motion.div>
      </nav>
      <p
        className={`nav-caption${showCaption ? "" : " is-hidden"}`}
        aria-hidden={!showCaption}
      >
        {dragging ? "松手吸附" : "拖动滑块 · 点击导航 · 滚动页面"}
      </p>
    </header>
  );
}
