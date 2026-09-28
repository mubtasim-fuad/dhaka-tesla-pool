import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const templateUrl = new URL('../.env.example', import.meta.url);
const outputUrl = new URL('../.env', import.meta.url);
const values = {
  POSTGRES_PASSWORD: randomBytes(24).toString('base64url'),
  JWT_SECRET: randomBytes(48).toString('base64url'),
  DEMO_PASSWORD: randomBytes(18).toString('base64url'),
};
let contents = await readFile(templateUrl, 'utf8');
for (const [key, value] of Object.entries(values)) {
  contents = contents.replace(new RegExp(`^${key}=$`, 'm'), `${key}=${value}`);
}
try {
  await writeFile(outputUrl, contents, { flag: 'wx', mode: 0o600 });
  console.log(`Created ${fileURLToPath(outputUrl)} with unique local credentials.`);
  console.log('Open the private .env file to see the demo login password. Do not commit it.');
} catch (error) {
  if (error.code === 'EEXIST') {
    console.error('.env already exists; leaving your credentials unchanged.');
    process.exitCode = 1;
  } else throw error;
}
