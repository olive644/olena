import { isCronAuthorized } from "../src/backend/cron-auth.js";
import { cleanExpiredRooms } from "../src/backend/room-cleanup.js";
import { getGoogleAccessToken } from "../src/backend/google-service-account.js";
import { createVercelHandler } from "../src/backend/vercel-adapter.js";

export default createVercelHandler("/api/room-cleanup", async (request) => {
  if (!isCronAuthorized(request, process.env["CRON_SECRET"]))
    return new Response("Unauthorized", { status: 401 });
  const token = await getGoogleAccessToken(
    {
      clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
      privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
    },
    [
      "https://www.googleapis.com/auth/firebase.database",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  );
  const result = await cleanExpiredRooms(process.env["FIREBASE_DATABASE_URL"] ?? "", token);
  console.info(JSON.stringify({ event: "room_cleanup", ...result }));
  return Response.json(result);
});
