import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { Layout } from "./components/layout/Layout";
import { TopPage } from "./pages/TopPage";
import { BoardListPage } from "./pages/BoardListPage";
import { ThreadListPage } from "./pages/ThreadListPage";
import { ThreadPage } from "./pages/ThreadPage";
import { NewThreadPage } from "./pages/NewThreadPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { SettingsPage } from "./pages/SettingsPage";

/**
 * URL クエリパラメータ `setturnstiletoken` を検出し、
 * Turnstile セッショントークンとして自動設定するハンドラ。
 * Turnstile ページから戻ってきたときに機能する。
 */
function TurnstileTokenHandler() {
  const { setTurnstileSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("setTurnstileToken");
    if (token) {
      setTurnstileSession(token);
      // URL からトークンを除去（ブラウザ履歴は置き換え）
      const url = new URL(window.location.href);
      url.searchParams.delete("setTurnstileToken");
      navigate(url.pathname + url.search, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <TurnstileTokenHandler />
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
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
