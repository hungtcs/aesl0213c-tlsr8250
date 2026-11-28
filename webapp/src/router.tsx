import { Navigate, createHashRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { DevicePage } from "./pages/DevicePage";
import { EditorPage } from "./pages/EditorPage";
import { HomePage } from "./pages/HomePage";
import { BleOtaPage } from "./pages/tools/BleOtaPage";
import { BleUartPage } from "./pages/tools/BleUartPage";
import { SwsFlasherPage } from "./pages/tools/SwsFlasherPage";

export const router = createHashRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "editor/:templateId", Component: EditorPage },
      { path: "device", Component: DevicePage },
      { path: "tools/ota", Component: BleOtaPage },
      { path: "tools/sws", Component: SwsFlasherPage },
      { path: "tools/uart", Component: BleUartPage },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
