
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middlewares.ts";
import { getMyEvents } from "../controllers/user.controller.ts";

const userRouter = Router();



userRouter.get(
  "/users/me/events",
  requireAuth,
  getMyEvents,
);


export default userRouter;