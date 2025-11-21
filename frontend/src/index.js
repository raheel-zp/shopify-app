import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { BrowserRouter } from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AppProvider i18n={enTranslations}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AppProvider>
);
