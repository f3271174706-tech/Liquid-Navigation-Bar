# FZP Liquid Navigation

可直接复制到 React 项目中的液态玻璃导航组件。桌面端固定在顶部，宽度不超过
760px；620px 以下自动切换为底部悬浮导航，并适配 iPhone 安全区。

## 功能

- 点击、拖动、方向键切换导航
- 根据拖动速度保持体积并改变水滴形状
- 松手自动吸附并带弹性碰撞
- 页面滚动与当前项目双向同步
- 活动项目局部放大和轻量折射
- 自动遵循 `prefers-reduced-motion`
- 移动端底部安全区适配
- 组件样式已限定作用域，不污染业务页面

## 复制

将整个 `liquid-nav` 文件夹复制到目标项目，例如：

```text
src/
└─ components/
   └─ liquid-nav/
      ├─ LiquidNav.tsx
      ├─ liquid-nav.css
      └─ index.ts
```

安装依赖：

```bash
npm install motion lucide-react
```

目标项目需要 React 18 或更高版本。

## 使用

导航项的 `id` 必须与页面区块的 DOM `id` 相同：

```tsx
import { Home, Layers3, Sparkles, UserRound } from "lucide-react";
import {
  LiquidNav,
  type LiquidNavItem,
} from "./components/liquid-nav";

const items: LiquidNavItem[] = [
  { id: "home", label: "首页", icon: Home },
  { id: "work", label: "作品", icon: Layers3 },
  { id: "motion", label: "动效", icon: Sparkles },
  { id: "about", label: "关于", icon: UserRound },
];

export function App() {
  return (
    <main>
      <LiquidNav
        items={items}
        accentColor="#ef6c4c"
        captionDuration={2500}
      />

      {items.map((item) => (
        <section id={item.id} key={item.id} style={{ minHeight: "100svh" }}>
          {item.label}
        </section>
      ))}
    </main>
  );
}
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `items` | `LiquidNavItem[]` | 必填 | 导航项目，建议 3–6 项 |
| `accentColor` | `string` | `#ef6c4c` | 活动项目颜色 |
| `captionDuration` | `number` | `2500` | 功能提示展示毫秒数，传 `0` 可关闭 |
| `className` | `string` | `""` | 添加到组件根节点的类名 |
| `ariaLabel` | `string` | `页面导航` | 导航无障碍名称 |
| `onActiveChange` | `(item, index) => void` | — | 当前项目改变时调用 |
| `scrollContainerRef` | `RefObject<HTMLElement \| null>` | — | 指定需要与导航同步的内部滚动容器；默认监听页面滚动 |

`LiquidNavItem`：

```ts
interface LiquidNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}
```

## 调整位置与尺寸

通过传入的 `className` 覆盖根节点即可：

```tsx
<LiquidNav items={items} className="my-navigation" />
```

```css
.my-navigation {
  width: min(680px, calc(100vw - 24px));
}

@media (max-width: 620px) {
  .my-navigation {
    bottom: calc(env(safe-area-inset-bottom) + 18px);
  }
}
```

## 接入注意

- 页面区块应有足够高度，否则滚动同步可能一次跨过多个项目。
- 组件使用 `position: fixed`，默认层级为 `50`。
- 请勿在祖先元素上添加 `transform`，否则固定定位可能相对该祖先生效。
- 组件只使用轻量 CSS 玻璃效果，没有实时页面截图或持续 WebGL 渲染。
