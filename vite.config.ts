import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function readGitValue(command: string): string | null {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return null
  }
}

// https://vite.dev/config/
export default defineConfig(() => {
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const isGithubActionsBuild = Boolean(process.env.GITHUB_ACTIONS)
  const base = isGithubActionsBuild && repositoryName ? `/${repositoryName}/` : '/'
  const buildLabel =
    process.env.VITE_APP_BUILD_LABEL?.trim() ||
    process.env.CF_PAGES_COMMIT_SHA?.trim().slice(0, 7) ||
    process.env.GITHUB_SHA?.trim().slice(0, 7) ||
    readGitValue('git rev-parse --short HEAD') ||
    ''
  const buildUrl = process.env.VITE_APP_BUILD_URL?.trim() || ''

  return {
    plugins: [react()],
    base,
    define: {
      __APP_BUILD_LABEL__: JSON.stringify(buildLabel),
      __APP_BUILD_URL__: JSON.stringify(buildUrl),
    },
  }
})
