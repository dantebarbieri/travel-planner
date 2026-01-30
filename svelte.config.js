import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// Output directory for the built server
			out: 'build',
			// Precompress static assets with gzip and brotli
			precompress: true,
			// Use standard env var names (PORT, HOST, ORIGIN) without prefix.
			// 
			// SECURITY NOTE: This setting only affects which env vars adapter-node
			// reads for server configuration (PORT, HOST, ORIGIN, etc). It does NOT
			// expose these to the client - they remain server-side only.
			// 
			// App secrets (API keys, etc.) should use $env/dynamic/private which
			// SvelteKit enforces as server-only regardless of this setting.
			// 
			// This empty prefix is intentional for Docker/container deployments
			// where PORT, HOST, ORIGIN are standard conventions.
			envPrefix: ''
		})
	}
};

export default config;
