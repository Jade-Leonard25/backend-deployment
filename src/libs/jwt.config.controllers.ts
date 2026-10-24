
import { jwt } from 'hono/jwt'
import type { JwtVariables } from 'hono/jwt'
import dotenv from 'dotenv';
dotenv.config();

export type Variables = JwtVariables

const jwtSecret = process.env.JWT_KEY || process.env.HEADER_BEARER || '';

export const jwtMiddleware = jwt({
  secret: jwtSecret,
  alg: 'HS256',
})
