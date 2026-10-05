import { Router } from "express";
import { checkAuth } from "../middlewares/auth.middlewares";
import { getEventAnalytics, getEventTrends, getFunnelAnalytics } from "../controllers/analytics.controller";

const analyticsRouter = Router();

analyticsRouter.get(
  "/events",
  checkAuth,
  getEventAnalytics,
);

analyticsRouter.get(
  "/funnel",
  checkAuth,
  getFunnelAnalytics,
);

analyticsRouter.get(
  "/trends",
  checkAuth,
  getEventTrends,
);

export default analyticsRouter;