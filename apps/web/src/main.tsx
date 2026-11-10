import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { App } from "./App";
import { MarketProvider } from "./market";
import { AdminPage } from "./pages/Admin";
import { AlertsPage } from "./pages/Alerts";
import { CalendarPage } from "./pages/Calendar";
import { DashboardPage } from "./pages/Dashboard";
import { MarketPage } from "./pages/Market";
import { NewsPage } from "./pages/News";
import { QuotePage } from "./pages/Quote";
import { SettingsPage } from "./pages/Settings";
import { WatchPage } from "./pages/Watch";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MarketProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<DashboardPage />} />
            <Route path="market" element={<MarketPage />} />
            <Route path="watch" element={<WatchPage />} />
            <Route path="quote/:symbol" element={<QuotePage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MarketProvider>
  </StrictMode>,
);
