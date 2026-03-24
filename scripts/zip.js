const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');

// Read version from snel-seo.php
const pluginFile = fs.readFileSync(path.join(root, 'snel-seo.php'), 'utf8');
const match = pluginFile.match(/^\s*\*\s*Version:\s*(.+)$/m);

if (!match) {
    console.error('Could not find Version in snel-seo.php');
    process.exit(1);
}

const version = match[1].trim();
const zipName = `snel-seo-${version}.zip`;
const distDir = path.join(root, 'dist');

console.log(`\nBuilding snel-seo v${version}...\n`);

// Install composer deps (production only)
console.log('Installing composer dependencies...');
execSync('composer install --no-dev --optimize-autoloader', { cwd: root, stdio: 'inherit' });

// Build assets
console.log('\nBuilding assets...');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

// Create dist directory
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Create zip
console.log(`\nCreating ${zipName}...`);
const zipPath = path.join(distDir, zipName);

// Remove old zip if exists
if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
}

const excludes = [
    '.git/*',
    '.github/*',
    'node_modules/*',
    'src/*',
    'scripts/*',
    'dist/*',
    '.gitignore',
    'package.json',
    'package-lock.json',
    'composer.json',
    'composer.lock',
    'webpack.config.js',
    'postcss.config.js',
    '.DS_Store',
];

// Create a temp folder named 'snel-seo' so the zip extracts to the correct folder name.
const tmpDir = path.join(root, '..', 'snel-seo-zip-tmp');
const tmpPlugin = path.join(tmpDir, 'snel-seo');

if (fs.existsSync(tmpDir)) {
    execSync(`rm -rf "${tmpDir}"`);
}
fs.mkdirSync(tmpPlugin, { recursive: true });

const rsyncExcludes = excludes.map(e => `--exclude='${e}'`).join(' ');
execSync(`rsync -a ${rsyncExcludes} "${root}/" "${tmpPlugin}/"`, { stdio: 'inherit' });
execSync(`cd "${tmpDir}" && zip -r "${zipPath}" snel-seo/`, { stdio: 'inherit' });
execSync(`rm -rf "${tmpDir}"`);

// Sync version to package.json
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (pkg.version !== version) {
    pkg.version = version;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`\nSynced package.json version to ${version}`);
}

console.log(`\n✓ Done! ${zipName} is in dist/\n`);
