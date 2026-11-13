import { useEffect, useState } from 'react';

export function useOffline() {
  const [status, setStatus] = useState(
    import.meta.env.PROD ? '正在准备离线缓存…' : '开发预览 · 离线缓存未启用',
  );
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      setStatus('当前地址不支持离线缓存，请使用本机 localhost。');
      return;
    }
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let channel: MessageChannel | undefined;
    const check = async () => {
      try {
        await navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' });
        const registration = await navigator.serviceWorker.ready;
        if (disposed) return;
        channel = new MessageChannel();
        timeout = setTimeout(() => {
          if (!disposed) setStatus('暂时无法确认离线缓存，请联网刷新后重试。');
        }, 5000);
        channel.port1.onmessage = (event) => {
          clearTimeout(timeout);
          if (!disposed)
            setStatus(
              event.data?.ready
                ? '离线已就绪 · 同一浏览器中可离线打开'
                : '离线缓存不完整，请联网刷新后重试。',
            );
        };
        registration.active?.postMessage({ type: 'CHECK_CACHE' }, [channel.port2]);
      } catch {
        if (!disposed) setStatus('离线缓存准备失败，当前仍可在线使用。');
      }
    };
    void check();
    return () => {
      disposed = true;
      clearTimeout(timeout);
      channel?.port1.close();
    };
  }, []);
  return status;
}
