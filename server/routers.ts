import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { marketDataRouter } from "./routers/marketData";
import { newsRouter } from "./routers/news";
import { carrierRecommendationRouter } from "./routers/carrierRecommendation";
import { predictiveRiskRouter } from "./routers/predictiveRisk";
import { marginCalculatorRouter } from "./routers/marginCalculator";
import { marginAnalysisRouter } from "./routers/marginAnalysis";
import { merchantProfileRouter } from "./routers/merchantProfile";
import { getAllSubscribers, getSubscriberByEmail, insertSubscriber } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  marketData: marketDataRouter,
  news: newsRouter,
  carrierRecommendation: carrierRecommendationRouter,
  predictiveRisk: predictiveRiskRouter,
  marginCalculator: marginCalculatorRouter,
  marginAnalysis: marginAnalysisRouter,
  merchantProfile: merchantProfileRouter,

  subscribers: router({
    /**
     * Public: anyone can submit their name + email to subscribe.
     * Validates input, checks for duplicate email, and inserts into DB.
     */
    subscribe: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Name is required").max(255),
          email: z.string().email("Please enter a valid email address").max(320),
        })
      )
      .mutation(async ({ input }) => {
        const existing = await getSubscriberByEmail(input.email);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This email is already subscribed.",
          });
        }
        const { id } = await insertSubscriber({
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
        });
        return { success: true, id };
      }),

    /**
     * Protected: only authenticated users (owner/admin) can list all subscribers.
     */
    list: protectedProcedure.query(async () => {
      return getAllSubscribers();
    }),
  }),
});

export type AppRouter = typeof appRouter;
