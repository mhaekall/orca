import { createAuthClient } from "better-auth/react";
import { getAppBaseUrl } from "./capacitor";

export const authClient = createAuthClient({
    baseURL: getAppBaseUrl(),
});
