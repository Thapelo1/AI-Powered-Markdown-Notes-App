import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register(`/sw.js?v=${__PWA_BUILD_ID__}`).catch((error) => {
    console.error("Service worker registration failed:", error);
  });
}

// Browser entrypoint: mount the app in StrictMode so React also surfaces lifecycle issues in development.
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
