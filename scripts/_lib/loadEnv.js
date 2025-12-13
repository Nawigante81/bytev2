import fs from 'node:fs';
import dotenv from 'dotenv';

const candidates = ['.env.test', '.env', '.env.local'];

for (const envPath of candidates) {
	if (fs.existsSync(envPath)) {
		dotenv.config({ path: envPath });
		break;
	}
}

