import { createAuthClient } from "better-auth/react";
import { getAppBaseUrl, isCapacitor } from "./capacitor";

const capacitorAuth = {
    type: "Bearer" as const,
    token: () => {
        if (typeof window !== 'undefined' && isCapacitor()) {
            return localStorage.getItem('better_auth_session') || undefined;
        }
        return undefined;
    }
};

export const authClient = createAuthClient({
    baseURL: getAppBaseUrl(),
    fetchOptions: {
        ...(isCapacitor() ? { auth: capacitorAuth } : {}),
        onError: (context) => {
            if (context.error.status === 401 && isCapacitor()) {
                localStorage.removeItem('better_auth_session');
            }
        }
    }
});
