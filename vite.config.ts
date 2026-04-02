import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

// https://vite.dev/config/
export default defineConfig(() => {
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const isGithubActionsBuild = Boolean(process.env.GITHUB_ACTIONS)
  const base = isGithubActionsBuild && repositoryName ? `/${repositoryName}/` : '/'

  return {
    plugins: [react()],
    base,
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
  }
})
