import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { checkAndSendAlerts } from "./alertTrigger";
import { getRecentSentAlerts } from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /**
   * Admin: manually trigger the alert check against the current news cache.
   * Useful for testing or forcing an immediate send after a breaking event.
   * Accepts an optional `forceResend` flag to bypass the dedup check.
   */
  triggerAlerts: adminProcedure
    .input(z.object({ forceResend: z.boolean().optional().default(false) }))
    .mutation(async ({ input }) => {
      // Import here to avoid circular deps at module load time
      const { fetchAndClassifyNewsPublic } = await import("../routers/news");
      const newsItems = await fetchAndClassifyNewsPublic();

      if (input.forceResend) {
        // Temporarily bypass dedup by injecting a fake unique key
        // by appending a timestamp to the first item title
        if (newsItems.length > 0) {
          newsItems[0] = { ...newsItems[0], id: `force-${Date.now()}` };
        }
      }

      const result = await checkAndSendAlerts(newsItems);
      return result;
    }),

  /**
   * Admin: get the last 20 sent alert records.
   */
  sentAlerts: adminProcedure.query(async () => {
    return getRecentSentAlerts(20);
  }),
});
