import { type Request, type Response, type NextFunction } from "express";
import { verifyAccessToken } from "../lib/tokens";

const getAccessTokenFromRequest = (req: Request) => {
  const fromCookie = req.cookies?.accessToken;
  if (fromCookie) {
    return fromCookie as string;
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }

  return null;
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {

  const token = getAccessTokenFromRequest(req);


  if (!token) {
    return res.status(401).json({ message: "Access token missing" });
  }

  try {
    const decoded = verifyAccessToken(token);
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};

export const checkAuth = (req: Request, _res: Response, next: NextFunction) => {
  req.userId = null;

  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token) as { userId: string };
    req.userId = decoded.userId;
  } catch {
    // bad or expired token, treat the request as a guest
  }

  next();
};
