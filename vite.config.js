import path from 'node:path';
import fs from 'node:fs';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';
import inlineEditPlugin from './plugins/visual-editor/vite-plugin-react-inline-editor.js';
import editModeDevPlugin from './plugins/visual-editor/vite-plugin-edit-mode.js';
import iframeRouteRestorationPlugin from './plugins/vite-plugin-iframe-route-restoration.js';

const isDev = process.env.NODE_ENV !== 'production';

const configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;

const configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;

const configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;

const configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/\.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;

const configNavigationHandler = `
if (window.navigation && window.self !== window.top) {
	window.navigation.addEventListener('navigate', (event) => {
		const url = event.destination.url;

		try {
			const destinationUrl = new URL(url);
			const destinationOrigin = destinationUrl.origin;
			const currentOrigin = window.location.origin;

			if (destinationOrigin === currentOrigin) {
				return;
			}
		} catch (error) {
			return;
		}

		window.parent.postMessage({
			type: 'horizons-navigation-error',
			url,
		}, '*');
	});
}
`;

const addTransformIndexHtml = {
	name: 'add-transform-index-html',
	transformIndexHtml(html) {
		const tags = [
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsRuntimeErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsViteErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: {type: 'module'},
				children: configHorizonsConsoleErrroHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configWindowFetchMonkeyPatch,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configNavigationHandler,
				injectTo: 'head',
			},
		];

		if (!isDev && process.env.TEMPLATE_BANNER_SCRIPT_URL && process.env.TEMPLATE_REDIRECT_URL) {
			tags.push(
				{
					tag: 'script',
					attrs: {
						src: process.env.TEMPLATE_BANNER_SCRIPT_URL,
						'template-redirect-url': process.env.TEMPLATE_REDIRECT_URL,
					},
					injectTo: 'head',
				}
			);
		}

		return {
			html,
			tags,
		};
	},
};

console.warn = () => {};

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
	if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
		return;
	}

	loggerError(msg, options);
}

export default defineConfig({
	customLogger: logger,
	optimizeDeps: {
		exclude: ['rss-parser']
	},
	plugins: [
		// Generates src/generated/galleryManifest.json from files in public/gallery
		(function galleryManifestPlugin() {
			const pluginName = 'gallery-manifest';
			const galleryDir = path.resolve(__dirname, 'public', 'gallery');
			const outDir = path.resolve(__dirname, 'src', 'generated');
			const outFile = path.resolve(outDir, 'galleryManifest.json');

			function naturalSort(a, b) {
				// try to sort numerically if filenames like 1.webp, 10.webp
				const an = parseInt(a, 10);
				const bn = parseInt(b, 10);
				if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
				return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
			}

			function generate() {
				try {
					if (!fs.existsSync(galleryDir)) {
						fs.mkdirSync(galleryDir, { recursive: true });
					}
					const files = fs.readdirSync(galleryDir)
						.filter((f) => /\.(webp|png|jpg|jpeg|gif|avif|svg)$/i.test(f))
						.sort((a, b) => naturalSort(path.parse(a).name, path.parse(b).name));
					const images = files.map((f) => `/gallery/${f.replace(/\\/g, '/')}`);
					if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
					fs.writeFileSync(outFile, JSON.stringify({ images }, null, 2));
					return images.length;
				} catch (err) {
					console.error(`[${pluginName}] Failed to generate manifest`, err);
					return 0;
				}
			}

			return {
				name: pluginName,
				buildStart() {
					const count = generate();
					this.warn(`[${pluginName}] generated ${count} image entries`);
				},
				configureServer(server) {
					generate();
					// Optional: watch for changes in dev
					server.watcher.add(galleryDir);
					server.watcher.on('add', (p) => { if (p.startsWith(galleryDir)) generate(); });
					server.watcher.on('unlink', (p) => { if (p.startsWith(galleryDir)) generate(); });
				}
			};
		})(),
		...(isDev ? [inlineEditPlugin(), editModeDevPlugin(), iframeRouteRestorationPlugin()] : []),
		react(),
		addTransformIndexHtml
	],
	server: {
		cors: true,
		headers: {
			'Cross-Origin-Embedder-Policy': 'credentialless',
		},
		allowedHosts: true,
		proxy: {
			'/api/tech-news': {
				target: 'http://localhost:5173',
				bypass: async (req, res) => {
					// Dynamically fetch fresh news in dev mode
					try {
						const Parser = (await import('rss-parser')).default;
						const parser = new Parser({
							requestOptions: {
								headers: { 'User-Agent': 'ByteClinic-Tech-News-Dev/1.0' }
							}
						});
						
						const FEEDS = [
							{ key: 'benchmark', label: 'Benchmark.pl', urls: ['https://www.benchmark.pl/rss'] },
							{ key: 'spidersweb', label: "Spider's Web", urls: ['https://spidersweb.pl/feed'] },
							{ key: 'portaltechnologiczny', label: 'PortalTechnologiczny.pl', urls: ['https://portaltechnologiczny.pl/feed'] },
							{ key: 'antyweb', label: 'Antyweb', urls: ['https://antyweb.pl/feed'] },
						];
						
						const results = await Promise.allSettled(
							FEEDS.map(async (f) => {
								const feed = await parser.parseURL(f.urls[0]);
								const items = (feed.items || []).map((i) => ({
									title: i.title ?? '(bez tytułu)',
									link: i.link ?? '#',
									pubDate: i.pubDate,
									isoDate: i.isoDate || undefined,
									source: f.label,
								})).slice(0, 12);
								return { key: f.key, label: f.label, items };
							})
						);
						
						const grouped = {};
						for (const r of results) {
							if (r.status === 'fulfilled') {
								grouped[r.value.key] = { label: r.value.label, items: r.value.items };
							}
						}
						
						res.setHeader('Content-Type', 'application/json');
						res.setHeader('Cache-Control', 'no-store');
						res.end(JSON.stringify({ updatedAt: Date.now(), sources: grouped }));
						return;
					} catch (err) {
						// Fallback to static file on error
						return '/tech-news.json';
					}
				}
			}
		}
	},
	resolve: {
		extensions: ['.jsx', '.js', '.tsx', '.ts', '.json', ],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		rollupOptions: {
			external: [
				'@babel/parser',
				'@babel/traverse',
				'@babel/generator',
				'@babel/types'
			]
		}
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: './src/test/setup.js',
		include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
		coverage: {
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/test/',
				'**/*.d.ts',
			]
		}
	}
});
