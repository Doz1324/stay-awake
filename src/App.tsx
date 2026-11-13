import { useEffect, useState, useSyncExternalStore } from 'react';
import { Brand } from './components/Brand';
import { Home } from './pages/Home';
import { Session } from './pages/Session';
import { Result } from './pages/Result';
import { Settings } from './pages/Settings';
import { SessionManager } from './session/SessionManager';
import { summarize } from './statistics/statistics';
import { useOffline } from './offline/useOffline';
import { useTaskKey } from './tasks/useTaskTools';
import { registerStatusTool } from './session/webmcp';
import { budgetAt } from './session/budget';

export default function App() {
  const [manager] = useState(() => new SessionManager());
  const snapshot = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  const { state, now, ready, error, result } = snapshot;
  const [showSettings, setShowSettings] = useState(false);
  const offline = useOffline();
  const owned = state.active?.owner === manager.owner;
  const budget = budgetAt(state.records, now);
  useEffect(() => {
    void manager.initialize();
    return () => manager.dispose();
  }, [manager]);
  useEffect(() => registerStatusTool(manager), [manager]);
  useEffect(() => {
    document.documentElement.style.backgroundColor =
      state.settings.theme === 'dark' ? '#0b1020' : '#f4f6ff';
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', state.settings.theme === 'dark' ? '#0b1020' : '#f4f6ff');
  }, [state.settings.theme]);
  useTaskKey((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (owned) void manager.end();
      else if (showSettings) setShowSettings(false);
      else if (result) manager.returnHome();
    }
    if (event.code === 'Space' && !owned && !result && !showSettings) {
      const target = event.target as HTMLElement;
      if (target.closest('input, select, button, textarea, [contenteditable]')) return;
      event.preventDefault();
      void manager.start();
    }
  });
  const stats = summarize(state.records, now);
  return (
    <div className="app" data-theme={state.settings.theme}>
      <header className="site-header">
        <Brand />
        <span className="header-caption">短时唤醒工具</span>
        {!owned && (
          <div className="header-actions">
            <button
              className="quiet-button"
              onClick={() => setShowSettings((value) => !value)}
              aria-label={showSettings ? '返回主界面' : '设置与统计'}
            >
              {showSettings ? '返回' : '设置 / 统计'}
            </button>
          </div>
        )}
      </header>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          {owned && (
            <button className="quiet-button" onClick={() => void manager.end()}>
              结束本次
            </button>
          )}
        </div>
      )}
      {owned && state.active ? (
        <Session
          active={state.active}
          now={error ? state.active.deadline : now}
          manager={manager}
        />
      ) : showSettings ? (
        <Settings
          settings={state.settings}
          records={state.records}
          now={now}
          update={(value) => void manager.update(value)}
          back={() => setShowSettings(false)}
          offline={offline}
        />
      ) : result ? (
        <Result
          record={result}
          saveFeedback={(feedback) => void manager.saveFeedback(result.id, feedback)}
          budget={budget}
          now={now}
          disabled={!ready || !!error || !!state.active}
          supplement={() => void manager.start(true)}
          returnHome={manager.returnHome}
        />
      ) : (
        <Home
          settings={state.settings}
          update={(value) => void manager.update(value)}
          start={() => void manager.start()}
          budget={budget}
          now={now}
          supplement={() => void manager.start(true)}
          activeElsewhere={!!state.active}
          disabled={!ready || !!error}
          todaySessions={stats.todayCount}
        />
      )}
      <footer className="site-footer">
        <span>A short reset. Back to what matters.</span>
        <span>{offline.startsWith('离线已就绪') ? '离线已就绪' : '静音 · 本地保存'}</span>
      </footer>
    </div>
  );
}
