import { Hono } from "hono";
import { verify } from "hono/jwt";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import db from "../db";
import { deployments } from "../schema/schema";
import { eq, desc } from "drizzle-orm";
import { createDeploymentSchema } from "../globals/globals.config.controllers";
import { boss, startQueue } from "../queues/build-queue";

const deploymentControllers = new Hono<{
  Variables: { jwtPayload: { sub: string } };
}>();
const jwtSecret = process.env.JWT_KEY || process.env.HEADER_BEARER;

// Initialize queue when API starts (safe to call multiple times)
startQueue();

// Auth middleware: verifies the JWT and exposes the payload to handlers
deploymentControllers.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Missing or invalid Authorization header" });
  }

  if (!jwtSecret) {
    throw new HTTPException(500, { message: "Server auth misconfigured" });
  }

  try {
    const token = authHeader.slice(7);
    const payload = await verify(token, jwtSecret, "HS256");
    c.set("jwtPayload", payload as { sub: string });
  } catch {
    throw new HTTPException(401, { message: "Invalid or expired token" });
  }

  await next();
});

deploymentControllers.post(
  "/",
  zValidator("json", createDeploymentSchema),
  async (c) => {
    try {
      const payload = c.get("jwtPayload");
      const { projectName, sourceType } = c.req.valid("json");

      // Hardcoded for testing
      const repoUrl = "https://github.com/Jade-Leonard25/testing-deployments.git";
      const branch = "main";

      const [newDeployment] = await db
        .insert(deployments)
        .values({
          userId: payload.sub,
          projectName,
          sourceType,
          status: "pending",
        })
        .returning();

      const jobId = await boss.send("build-jobs", {
        deploymentId: newDeployment.id,
        repoUrl,
        branch,
      });

      console.log(`📦 Job ${jobId} sent to queue!`);

      return c.json(
        { success: true, message: "Deployment queued", data: newDeployment },
        201
      );
    } catch (error: any) {
      return c.json(
        { success: false, message: "Failed to create deployment", error: error.message },
        500
      );
    }
  }
);

// List the logged-in user's deployments, newest first
deploymentControllers.get("/", async (c) => {
  const payload = c.get("jwtPayload");
  const rows = await db
    .select()
    .from(deployments)
    .where(eq(deployments.userId, payload.sub))
    .orderBy(desc(deployments.createdAt));
  return c.json({ success: true, data: rows });
});

export default deploymentControllers;