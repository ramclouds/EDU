import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { APP_NAME, APP_FAVICON } from "./config/appConfig";

// Tailwind is now compiled at build time via @tailwindcss/vite (see
// vite.config.js) instead of the old runtime CDN <script>, which Tailwind
// itself warns is not meant for production. This also carries the
// premium shadow/scrollbar/card polish shared by every dashboard.
import "./css/theme.css";
// Self-hosted from the bootstrap-icons npm package (already a dependency)
// instead of the jsdelivr CDN link that was in index.html — one less
// external network dependency for the app to render correctly.
import "bootstrap-icons/font/bootstrap-icons.css";

// TITLE
document.title = APP_NAME;

// FAVICON
const setFavicon = (iconUrl) => {
  let link = document.querySelector("link[rel~='icon']");

  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.href = iconUrl;
};

setFavicon(APP_FAVICON);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);