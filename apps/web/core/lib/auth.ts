import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { getDb } from "./db";
import * as schema from "./schema";

let _auth: any = null;

function createAuth() {
    return betterAuth({
        baseURL: process.env.BETTER_AUTH_URL || "https://orcanime.pages.dev",
        trustedOrigins: ["https://orcanime.pages.dev", "http://localhost:3000", "capacitor://localhost", "https://localhost"],
        database: drizzleAdapter(getDb(), {
            provider: "pg",
            schema: {
                ...schema,
                user: schema.user,
                session: schema.session,
                account: schema.account,
                verification: schema.verification
            }
        }),
        plugins: [
            bearer(),
        ],
        socialProviders: {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID || "",
              clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            },
        },
        secret: process.env.BETTER_AUTH_SECRET,
    });
}

export const getAuth = (): ReturnType<typeof createAuth> => {
    if (!_auth) {
        _auth = createAuth();
    }
    return _auth;
};