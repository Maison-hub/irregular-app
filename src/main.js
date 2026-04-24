import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

createApp(App).mount('#app');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}sw.js`,
        { scope: import.meta.env.BASE_URL },
      );

      const warmUpCache = () => {
        const resourceUrls = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(window.location.origin));

        const urls = [
          window.location.href,
          `${window.location.origin}${import.meta.env.BASE_URL}`,
          ...resourceUrls,
        ];

        const target = registration.active ?? navigator.serviceWorker.controller;
        target?.postMessage({ type: 'CACHE_URLS', urls });
      };

      navigator.serviceWorker.addEventListener('controllerchange', warmUpCache);
      navigator.serviceWorker.ready.then(warmUpCache).catch(() => {});
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  });
}

