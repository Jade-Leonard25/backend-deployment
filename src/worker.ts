import 'dotenv/config';
import { boss, startQueue } from './queues/build-queue';
import { simpleGit } from 'simple-git';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import db from './db';
import { deployments } from './schema/schema';
import { eq } from 'drizzle-orm';
import { DEPLOYMENTS_DIR } from './paths';

// node_modules is created ONLY inside the container and deleted with it (--rm).
// The source is mounted read-only; only the built output is written to outDir.
function buildInDocker(srcDir: string, outDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = [
      'cp -r /src/. /tmp/app',
      'cd /tmp/app',
      'npm install --include=dev --ignore-scripts',
      'npm run build',
      '(cp -r dist/. /out 2>/dev/null || cp -r build/. /out)',
    ].join(' && ');

    const args = [
      'run', '--rm',
      '--memory', '1g',
      '--cpus', '1',
      '--user', `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
      '-e', 'HOME=/tmp',
      '-e', 'NODE_ENV=production',
      '-v', `${srcDir}:/src:ro`,
      '-v', `${outDir}:/out`,
      'node:22-alpine',
      'sh', '-c', `mkdir -p /tmp/app && ${script}`,
    ];

    console.log('\n[BUILD] Running build in Docker...');
    const child = spawn('docker', args);

    const timer = setTimeout(() => child.kill('SIGKILL'), 10 * 60_000); // 10 min limit

    child.stdout.on('data', (d) => console.log(d.toString().trim()));
    child.stderr.on('data', (d) => console.error(d.toString().trim()));
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Docker build failed with exit code ${code}`));
    });
  });
}

async function run() {
  await startQueue();

  await boss.work("build-jobs", async (jobs) => {
    for (const job of jobs) {
      const { deploymentId, repoUrl, branch } = job.data as { deploymentId: string; repoUrl: string; branch: string; };
      const srcDir = path.join(os.tmpdir(), 'builds', deploymentId);
      const outDir = path.join(DEPLOYMENTS_DIR, deploymentId, 'public');

      console.log(`\n🚀 Starting build for deployment: ${deploymentId}`);

      try {
        await db.update(deployments).set({ status: 'building' }).where(eq(deployments.id, deploymentId));

        await fs.rm(srcDir, { recursive: true, force: true });
        await fs.mkdir(srcDir, { recursive: true });
        await fs.rm(outDir, { recursive: true, force: true });
        await fs.mkdir(outDir, { recursive: true });

        console.log(`📦 Cloning ${repoUrl} (${branch})...`);
        await simpleGit().clone(repoUrl, srcDir, ['--branch', branch || 'main', '--depth', '1']);

        await buildInDocker(srcDir, outDir);

        await db.update(deployments).set({ status: 'active' }).where(eq(deployments.id, deploymentId));
        console.log(`✅ Deployment ${deploymentId} successful!`);

      } catch (error: any) {
        console.error(`🚨 Deployment ${deploymentId} failed:`, error);
        await db.update(deployments).set({ status: 'failed' }).where(eq(deployments.id, deploymentId));
      } finally {
        await fs.rm(srcDir, { recursive: true, force: true }); // source only, no node_modules
      }
    }
  });

  console.log("👷 Worker is listening for build jobs...");
}

run().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});