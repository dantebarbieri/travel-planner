import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// Output directory for the built server
			out: 'build',
			// Precompress static assets with gzip and brotli
			precompress: true,
			// Environment variable for the port
			envPrefix: ''
		})
	}
};

export default config;
