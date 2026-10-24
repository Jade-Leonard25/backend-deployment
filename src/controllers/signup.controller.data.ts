import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { signUpSchema } from "../globals/globals.config.controllers";
import db from "../db";
import { users } from "../schema/schema";
import bcrypt from "bcryptjs";

const signControllers = new Hono();

signControllers.post(
    "/sign-up",
    zValidator("json", signUpSchema),
    async (c) => {
        const input = c.req.valid("json");

        console.log("🔥 1. REQUEST ARRIVED FOR:", input.email);

        try {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(input.password, salt);

            console.log("🔥 2. ATTEMPTING TO CONNECT TO NEON DB...");

            const result = await db.insert(users).values({
                username: input.email.split("@")[0],
                email: input.email,
                passwordHash: passwordHash,
            }).returning();

            console.log("🔥 3. NEON DB RETURNED:", result);

            return c.json({ success: true, user: result[0] }, 201);

        } catch (error: any) {
            console.error("🚨 4. NEON DB FAILED COMPLETELY. REASON:", error.message);
            return c.json({ success: false, message: error.message }, 500);
        }
    }
);

signControllers.get("/users", async (c) => {
    try {
        const allUsers = await db.select().from(users);
        return c.json({ success: true, users: allUsers });
    } catch (error: any) {
        console.error("🚨 DB FETCH FAILED:", error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

export default signControllers;