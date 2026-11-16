import { config } from "dotenv";

// Tests prefer .env.test, then fall back to .env (never overriding real env).
config({ path: ".env.test", quiet: true });
config({ path: ".env", quiet: true });
