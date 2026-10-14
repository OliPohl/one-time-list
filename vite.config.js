import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'node:fs';

/**
 * Copies Excalidraw's fonts (the Whiteboard page) into `static/excalidraw`, so they're served from this site:
 * Excalidraw would load them from a CDN otherwise. Not in git, they come from the installed package.
 * @returns {import('vite').Plugin}
 */
function excalidrawFonts() {
	return {
		name: 'excalidraw-fonts',
		buildStart() {
			const target = 'static/excalidraw/fonts';
			if (!existsSync(target)) cpSync('node_modules/@excalidraw/excalidraw/dist/prod/fonts', target, { recursive: true });
		}
	};
}

export default defineConfig({
	plugins: [excalidrawFonts(), sveltekit()]
});
