import { Boxes, Home, Layers3, Sparkles, UserRound } from "lucide-react";
import { LiquidNav, type LiquidNavItem } from "./components/liquid-nav";

const navigation: LiquidNavItem[] = [
  { id: "home", label: "首页", icon: Home },
  { id: "work", label: "作品", icon: Layers3 },
  { id: "motion", label: "动效", icon: Sparkles },
  { id: "components", label: "组件", icon: Boxes },
  { id: "about", label: "关于", icon: UserRound },
];

const sections = [
  {
    id: "home",
    eyebrow: "FZP UI · 01",
    title: "一枚会呼吸的导航滑块",
    copy: "拖住顶部滑块左右移动。它会沿手势方向拉伸、折射下方内容，并在松手后弹回最近的导航项。",
    color: "blue",
  },
  {
    id: "work",
    eyebrow: "DRAGGABLE · 02",
    title: "拖动，而不只是点击",
    copy: "滑块响应指针速度改变形状。快速移动时更宽，慢下来时逐渐收紧，保留真实的惯性感。",
    color: "violet",
  },
  {
    id: "motion",
    eyebrow: "REFRACTION · 03",
    title: "透明折射状态",
    copy: "透镜内部复制并放大导航内容，叠加冷暖色散、高光和饱和度变化，形成可读且克制的玻璃折射。",
    color: "coral",
  },
  {
    id: "components",
    eyebrow: "SYNCED · 04",
    title: "导航与页面双向同步",
    copy: "点击或拖动导航会滚动页面；手动浏览页面时，滑块也会自动追踪当前章节。",
    color: "mint",
  },
  {
    id: "about",
    eyebrow: "ACCESSIBLE · 05",
    title: "触摸、鼠标和键盘都可用",
    copy: "支持方向键、点击和触摸拖动，并遵循减少动态效果偏好，适合作为真实项目中的导航模板。",
    color: "amber",
  },
];

export function App() {
  return (
    <main>
      <LiquidNav items={navigation} />

      {sections.map((section, index) => (
        <section
          id={section.id}
          className={`demo-section demo-section--${section.color}`}
          key={section.id}
        >
          <div className="ambient-orb ambient-orb--one" />
          <div className="ambient-orb ambient-orb--two" />
          <article className="section-card">
            <p>{section.eyebrow}</p>
            <span className="section-number">0{index + 1}</span>
            <h1>{section.title}</h1>
            <div className="section-rule" />
            <p className="section-copy">{section.copy}</p>
            {index === 0 && (
              <div className="drag-hint">
                <span />
                拖动顶部玻璃滑块
              </div>
            )}
          </article>
        </section>
      ))}
    </main>
  );
}
