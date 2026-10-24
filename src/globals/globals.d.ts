import { signUpSchema, loginSchema, createDeploymentSchema } from "./globals.config.controllers";
import { z } from 'zod';

declare global {
    type SignUpInput = z.infer<typeof signUpSchema>;
    type LoginInput = z.infer<typeof loginSchema>;
    type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;
}

export {}
