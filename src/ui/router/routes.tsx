import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { HomePage } from "../pages/home/HomePage";
import { TodayBriefingPage } from "../pages/briefing/TodayBriefingPage";
import { PapersPage } from "../pages/papers/PapersPage";
import { AuthorsPage } from "../pages/authors/AuthorsPage";
import { ArchivePage } from "../pages/archive/ArchivePage";
import { TrendsPage } from "../pages/trends/TrendsPage";
import { SettingsPage } from "../pages/settings/SettingsPage";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "briefing-hoy", element: <TodayBriefingPage /> },
      { path: "papers", element: <PapersPage /> },
      { path: "autores", element: <AuthorsPage /> },
      { path: "archivo", element: <ArchivePage /> },
      { path: "tendencias", element: <TrendsPage /> },
      { path: "configuracion", element: <SettingsPage /> },
    ],
  },
]);
