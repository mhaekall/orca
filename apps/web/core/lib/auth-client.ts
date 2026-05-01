import { createAuthClient } from "better-auth/react";
import { getAppBaseUrl, isCapacitor } from "./capacitor";

export const authClient = createAuthClient({
    baseURL: getAppBaseUrl(),
    fetchOptions: {
        auth: {
            type: "Bearer",
            token: () => {
                if (typeof window !== 'undefined' && isCapacitor()) {
                    return localStorage.getItem('better_auth_session') || undefined;
                }
                return undefined;
            }
        },
        onError: (context) => {
            if (context.error.status === 401 && isCapacitor()) {
                localStorage.removeItem('better_auth_session');
            }
        }
    }
});
