import 'dotenv/config';
import {PgBoss} from 'pg-boss';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

// ⚠️ IMPORTANT: Make sure your DATABASE_URL in .env is the DIRECT connection string.
// If it contains "-pooler", pg-boss will fail.
export const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  schema: 'pgboss',
});

boss.on("error", (err) => console.error("🚨 pg-boss error:", err));

export async function startQueue() {
  await boss.start();
  // Required in v10+ to ensure the queue exists before sending/receiving
  await boss.createQueue("build-jobs"); 
  console.log("✅ PgBoss queue initialized.");
}