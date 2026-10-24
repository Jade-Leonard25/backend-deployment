import type {HonoRequest} from 'hono';
import * as schema from '../schema/schema';
import db from '../db';
import {z} from 'zod'

const SignUpPropsSchema = z.object({})
export const signUp = async () => {
    try {
        const data = await db.
    }
}
