import { Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/navbar";
import { ChatPage } from "./pages/chat";
import { HomePage } from "./pages/home";

export function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        {/* Optional: redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
