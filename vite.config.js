import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'irregular-app';

export default defineConfig(({ command }) => ({
  plugins: [vue()],
  base: process.env.VITE_BASE_PATH ?? (command === 'serve' ? '/' : `/${repositoryName}/`),
}));

