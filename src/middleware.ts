import { defineMiddleware } from "astro:middleware";

// Middleware auth logic disabled to rely on Nginx/CloudPanel Basic Auth
// This prevents "Failed to fetch" errors due to double authentication
export const onRequest = defineMiddleware(async (context, next) => {
    // const url = new URL(context.request.url);

    // // Only protect /keystatic routes
    // if (url.pathname.startsWith("/keystatic")) {
    //      // Auth handled by Server (Nginx/CloudPanel)
    //      return next();
    // }

    return next();
});
