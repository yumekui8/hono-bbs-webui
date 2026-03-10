import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/layout/Layout";
import { TopPage } from "./pages/TopPage";
import { BoardListPage } from "./pages/BoardListPage";
import { ThreadListPage } from "./pages/ThreadListPage";
import { ThreadPage } from "./pages/ThreadPage";
import { NewThreadPage } from "./pages/NewThreadPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<TopPage />} />
              <Route path="boards" element={<BoardListPage />} />
              <Route path="boards/:boardId" element={<ThreadListPage />} />
              <Route path="boards/:boardId/threads/new" element={<NewThreadPage />} />
              <Route path="boards/:boardId/threads/:threadId" element={<ThreadPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
