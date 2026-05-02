import { createAuthClient } from "better-auth/react";
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
    baseURL: "https://orcanime.pages.dev",
    // We can add custom fetch options here if we need to manage headers manually later, 
    // but React Native's fetch automatically handles cookies from the server by default.
});
