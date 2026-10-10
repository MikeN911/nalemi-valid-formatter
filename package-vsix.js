const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function bumpVersion(currentVersion, bumpType = 'patch') {
	const parts = currentVersion.split('.').map((p) => parseInt(p, 10));
	if (parts.length !== 3 || parts.some(isNaN)) {
		throw new Error(`Neplatný formát stávající verze: ${currentVersion}`);
	}

	let [major, minor, patch] = parts;

	if (bumpType === 'major') {
		major += 1;
		minor = 0;
		patch = 0;
	} else if (bumpType === 'minor') {
		minor += 1;
		patch = 0;
	} else if (bumpType === 'patch') {
		patch += 1;
	} else if (/^\d+\.\d+\.\d+$/.test(bumpType)) {
		return bumpType;
	} else {
		throw new Error(`Neznámý typ navýšení verze: ${bumpType} (povolené: patch, minor, major nebo konkrétní verze X.Y.Z)`);
	}

	return `${major}.${minor}.${patch}`;
}

async function main() {
	const packageJsonPath = path.join(__dirname, 'package.json');
	const packageJsonRaw = fs.readFileSync(packageJsonPath, 'utf8');
	const pkg = JSON.parse(packageJsonRaw);

	const arg = process.argv[2] || 'patch';
	const oldVersion = pkg.version;
	const newVersion = bumpVersion(oldVersion, arg);

	console.log(`\n========================================`);
	console.log(`📦 Balíčkování rozšíření: ${pkg.displayName || pkg.name}`);
	console.log(`🔄 Verze: ${oldVersion} -> ${newVersion}`);
	console.log(`========================================\n`);

	// 1. Update package.json version
	pkg.version = newVersion;
	fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, '\t') + '\n', 'utf8');
	console.log(`✅ Verze v package.json nastavena na ${newVersion}`);

	// 2. Run automated tests
	console.log(`\n🧪 Spouštím testy...`);
	try {
		execSync('npm test', { stdio: 'inherit', cwd: __dirname });
		console.log(`✅ Testy úspěšně proběhly.`);
	} catch (err) {
		console.error(`❌ Testy selhaly! Vracím původní verzi ${oldVersion}...`);
		pkg.version = oldVersion;
		fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, '\t') + '\n', 'utf8');
		process.exit(1);
	}

	// 3. Build bundle
	console.log(`\n⚙️ Kompiluji produkční balíček (esbuild)...`);
	execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
	console.log(`✅ Kompilace dokončena.`);

	// 4. Package VSIX with vsce
	console.log(`\n📦 Vytvářím .vsix balíček...`);
	const vsixFileName = `${pkg.name}-${newVersion}.vsix`;
	execSync(`npx @vscode/vsce package --no-dependencies --allow-missing-repository -o "${vsixFileName}"`, {
		stdio: 'inherit',
		cwd: __dirname,
	});

	const vsixFullPath = path.join(__dirname, vsixFileName);
	console.log(`\n========================================`);
	console.log(`🎉 HOTOVO! VSIX balíček byl úspěšně vytvořen:`);
	console.log(`📁 ${vsixFullPath}`);
	console.log(`========================================\n`);
	console.log(`Instalaci do Antigravity IDE nebo VS Code provedete příkazem:`);
	console.log(`code --install-extension "${vsixFileName}"`);
	console.log(`Nebo v IDE: Extensions -> Menu (...) -> "Install from VSIX..."\n`);
}

main().catch((err) => {
	console.error(`Chyba při vytváření balíčku:`, err);
	process.exit(1);
});
