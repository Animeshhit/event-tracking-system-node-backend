import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ACCESS_TOKEN_EXPIRY, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_EXPIRY } from "../../env";

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export const generateAccessToken = (payload: AccessTokenPayload) => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY as any || "15m",
  });
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token,ACCESS_TOKEN_SECRET!) as AccessTokenPayload;
};

export const getRefreshTokenExpiryDate = () => {
  const days = parseInt(REFRESH_TOKEN_EXPIRY?.replace("d", "") || "7", 10);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};