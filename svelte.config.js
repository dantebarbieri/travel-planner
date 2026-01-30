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
			// This is intentional for Docker/container deployments.
			// Note: This only affects adapter-node runtime vars, not app secrets.
			// Server secrets use $env/dynamic/private which are never exposed to client.
			envPrefix: ''
		})
	}
};

export default config;
