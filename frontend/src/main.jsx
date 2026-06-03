import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { APP_NAME, APP_FAVICON } from "./config/appConfig"

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