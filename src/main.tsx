import { App as AntdApp, ConfigProvider, Spin } from 'antd';
import { createRoot } from 'react-dom/client';
import zhCN from 'antd/locale/zh_CN';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { authApi } from './api';
import { AppRoutes } from './App';
import { clearSession, getAccessToken, markAuthReady, setSessionUser, useAuth } from './auth';
import './index.css';

function Boot() {
  const { ready } = useAuth();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!getAccessToken()) {
        if (!cancelled) markAuthReady();
        return;
      }
      try {
        const me = await authApi.me();
        if (!cancelled) setSessionUser(me);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) markAuthReady();
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="boot">
        <Spin />
      </div>
    );
  }
  return <AppRoutes />;
}

export function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1d4ed8',
          borderRadius: 8,
          fontFamily: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif',
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <Boot />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
