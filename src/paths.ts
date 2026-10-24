import 'dotenv/config';
import os from 'node:os';
import path from 'node:path';

// Built sites are stored here, outside the project folder
export const DEPLOYMENTS_DIR =
  process.env.DEPLOYMENTS_DIR ?? path.join(os.homedir(), 'deploycraft-data');