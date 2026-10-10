const esbuild = require('esbuild');

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

async function main() {
	const extensionConfig = {
		entryPoints: ['src/extension.ts'],
		bundle: true,
		format: 'cjs',
		minify: isProduction,
		sourcemap: !isProduction,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'info',
	};

	const testConfig = {
		entryPoints: ['src/test/runTest.ts'],
		bundle: true,
		format: 'cjs',
		minify: false,
		sourcemap: true,
		platform: 'node',
		outfile: 'dist/test.js',
		external: ['vscode'],
		logLevel: 'info',
	};

	if (isWatch) {
		const ctxExt = await esbuild.context(extensionConfig);
		const ctxTest = await esbuild.context(testConfig);
		await Promise.all([ctxExt.watch(), ctxTest.watch()]);
		console.log('Watching for changes...');
	} else {
		await Promise.all([
			esbuild.build(extensionConfig),
			esbuild.build(testConfig).catch((err) => {
				console.warn('Note: test entry point build warning/skipped if not yet created:', err.message);
			})
		]);
		console.log('Build finished successfully.');
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
