import {defineConfig} from 'drizzle-kit';
import dotenv from 'dotenv';
dotenv.config();
export default defineConfig({
    dialect:"postgresql",
    dbCredentials:{
        url:process.env.DATABASE_URL as string
    },
    schema:'./src/schema/schema.ts',
    out:'migration',
    schemaFilter:["public"]
})
