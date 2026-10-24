import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { sign } from "hono/jwt";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { loginSchema } from "../globals/globals.config.controllers";
import db from "../db";
import { users } from "../schema/schema";

const loginControllers = new Hono();

loginControllers.post(
  "/login",
  zValidator("json", loginSchema),
  async (c) => {
    try {
      const input = c.req.valid("json");
      const jwtSecret = process.env.JWT_KEY || process.env.HEADER_BEARER;

      if (!jwtSecret) {
        return c.json({ success: false, message: "Server auth misconfigured" }, 500);
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        return c.json({ success: false, message: "Invalid email or password" }, 401);
      }

      const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValidPassword) {
        return c.json({ success: false, message: "Invalid email or password" }, 401);
      }

      const payload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      };

      const token = await sign(payload, jwtSecret);

      return c.json({
        success: true,
        message: "Logged in successfully",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      }, 200);
    } catch (error: any) {
      console.error("Login error:", error);
      return c.json({ success: false, message: error?.message || "Internal server error" }, 500);
    }
  }
);

export default loginControllers;
