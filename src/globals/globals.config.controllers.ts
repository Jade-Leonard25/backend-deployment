import { z } from "zod";
export const signUpSchema = z.object({
  // ✅ Zod v4 syntax for emails
  email: z.email({ error: "Invalid Email" }).max(100), 
  password: z.string({ error: "Password is required to sign up" })
    .min(8, "Password must be at least 8 characters")
    .max(255),
  confirmPassword: z.string({ error: "Please confirm your password" })
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"], 
});
export const loginSchema = z.object({
  // Same as sign-up, using Zod v4 syntax
  email: z.email({ error: "Invalid Email" }).max(100),
  
  // We only require it to be a non-empty string. 
  // No .min(8) here, because we just want to check if it matches the DB.
  password: z.string({ error: "Password is required" }).min(1, "Password cannot be empty"),
});

export const createDeploymentSchema = z.object({
  projectName: z.string({ error: "Project name is required" }).min(1, "Project name cannot be empty").max(255),
  sourceType: z.enum(["zip", "github"]),
});
