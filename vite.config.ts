import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  // supabase/: the database tests (RLS policies on an in-memory Postgres) take a few seconds to start
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'supabase/**/*.test.ts'], environment: 'node', testTimeout: 30_000 }
});
