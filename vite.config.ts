import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages(https://saeeaam.github.io/saju-web/)에서는 /saju-web/ 아래에서 열린다.
  // 로컬 개발 서버는 / 그대로 쓴다.
  base: command === 'build' ? '/saju-web/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
}))
