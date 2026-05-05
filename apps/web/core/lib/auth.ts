import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./db";
import * as schema from "./schema";

function createAuth() {
    return betterAuth({
        baseURL: process.env.BETTER_AUTH_URL || "https://orcanime.pages.dev",
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
        socialProviders: {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID || "",
              clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            },
        },
        secret: process.env.BETTER_AUTH_SECRET,
        advanced: {
            useSecureCookies: true,
            crossSubDomainCookies: {
                enabled: true
            },
            defaultCookieAttributes: {
                sameSite: "none",
                secure: true,
            }
        }
    });
}

export const getAuth = (): ReturnType<typeof createAuth> => {
    // Prevent Cloudflare Edge environment variable caching by instantiating per-request
    return createAuth();
};
