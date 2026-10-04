import { Router } from "express";
import {
  RegisterUser,
  LoginUser,
  RefreshAccessToken,
  LogoutUser,
  getCurrentUser,
} from "../controllers/auth.controllers.ts";
import { requireAuth } from "../middlewares/auth.middlewares.ts";
import { authLimiter, refreshLimiter } from "../middlewares/ratelimiter.ts";

const authRouter = Router();

authRouter.post("/register", authLimiter, RegisterUser);
authRouter.post("/login", authLimiter, LoginUser);
authRouter.post("/refresh", refreshLimiter, RefreshAccessToken);
authRouter.post("/logout", requireAuth, LogoutUser);
authRouter.get("/me", requireAuth, getCurrentUser);

export default authRouter;