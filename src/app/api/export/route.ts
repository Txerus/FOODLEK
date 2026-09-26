import { getCurrentUser } from "@/server/auth/access";
import { exportAccountData } from "@/server/services/account";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const data = await exportAccountData(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="foodlek-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
