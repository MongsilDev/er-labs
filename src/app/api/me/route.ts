import { avatarUrl, currentUser } from "@/server/auth";
import { myTournaments } from "@/server/tournament";
import { handle, json } from "@/server/http";

export async function GET() {
  return handle(async () => {
    const user = await currentUser();
    if (!user) return json({ user: null, tournaments: [] });
    return json({ user: { ...user, avatar: avatarUrl(user) }, tournaments: myTournaments(user) });
  });
}
