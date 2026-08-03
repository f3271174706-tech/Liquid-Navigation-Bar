import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { DemoPage } from "./DemoPage";
import { PlaygroundPage } from "./PlaygroundPage";
import "./styles.css";

const searchParams = new URLSearchParams(window.location.search);
const isDemo = searchParams.has("demo");
const isPlayground = searchParams.has("playground");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isPlayground ? <PlaygroundPage /> : isDemo ? <DemoPage /> : <App />}
  </StrictMode>,
);
