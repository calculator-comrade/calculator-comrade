import process from 'node:process';

const supportedTargets = {
    linux: { platform: 'linux', label: 'Linux' },
    windows: { platform: 'win32', label: 'Windows' },
};

const targetName = process.argv[2];
const target = Object.hasOwn(supportedTargets, targetName)
    ? supportedTargets[targetName]
    : undefined;

if (!target) {
    console.error('Usage: node scripts/check-desktop-build-platform.js <linux|windows>');
    process.exitCode = 2;
} else if (process.platform !== target.platform) {
    const hostName = {
        linux: 'Linux',
        win32: 'Windows',
        darwin: 'macOS',
    }[process.platform] ?? process.platform;

    console.error(
        `Cannot build Calculator Comrade for ${target.label} on ${hostName}.\n` +
        `npm run build:desktop:${targetName} requires a ${target.label} host; ` +
        'this project does not configure cross-compilation.\n' +
        `Run the command on ${target.label} instead.`,
    );
    process.exitCode = 1;
} else {
    console.log(`Desktop build host verified: ${target.label}.`);
}
