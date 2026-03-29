import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const isGithubActionsBuild = Boolean(process.env.GITHUB_ACTIONS)
  const base = isGithubActionsBuild && repositoryName ? `/${repositoryName}/` : '/'

  return {
    plugins: [react()],
    base,
  }
})
