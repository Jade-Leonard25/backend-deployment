import { drizzle } from "drizzle-orm/neon-http";
import {neon} from '@neondatabase/serverless';
import * as schema from './schema/schema'
import 'dotenv/config';
const neon_sql = neon(process.env.DATABASE_URL!);
const db = drizzle({client:neon_sql});
export default db


