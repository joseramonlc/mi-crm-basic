import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

/** Usuario autenticado actual (nombre/email para la cabecera y el menú de cuenta). */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});
