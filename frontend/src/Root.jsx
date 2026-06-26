import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App";
import AssetDetail from "./pages/AssetDetail";
import IncidentPage from "./pages/IncidentPage";

export default function Root() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/incidents/:id" element={<IncidentPage />} />
      </Routes>
    </BrowserRouter>
  );
}