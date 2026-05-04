const { createAuthClient } = require("@better-auth/client");
const client = createAuthClient({
  baseURL: "http://localhost:3000",
  fetchOptions: {
    customFetchImpl: async (url, options) => {
      console.log(url, JSON.stringify(options.body));
      return { ok: true, json: async () => ({}) };
    }
  }
});

client.signIn.social({
  provider: "google",
  idToken: "dummy-id-token"
}).catch(console.error);
