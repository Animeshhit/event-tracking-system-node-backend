import { type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { users, refreshTokens } from "../db/schema";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate,
} from "../lib/tokens.ts";



/* --------------------------- REGISTER --------------------------- */

export const RegisterUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email));

    if (existingUser.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({ name, email, password: hashedPassword })
      .returning({ id: users.id, name: users.name, email: users.email });


      if(!newUser) return res.status(500).json({ message: "Failed to create user" });

    // --- auto-login: issue tokens immediately ---
    const accessToken = generateAccessToken({ userId: newUser.id, email: newUser.email });
    const refreshToken = generateRefreshToken();

    await db.insert(refreshTokens).values({
      userId: newUser.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshTokenExpiryDate(),
    });

   

    return res.status(201).json({
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user: newUser,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ----------------------------- LOGIN ----------------------------- */

export const LoginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken();

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshTokenExpiryDate(),
    });

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const RefreshAccessToken = async (req: Request, res: Response) => {
  try {
    const incomingToken = req.headers["x-refresh-token"] as string | undefined;

    if (!incomingToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    const [stored] = await db
      .select({
        _id: refreshTokens._id,
        userId: refreshTokens.userId,
        revoked: refreshTokens.revoked,
        expiresAt: refreshTokens.expiresAt,
        email: users.email,
      })
      .from(refreshTokens)
      .innerJoin(users, eq(refreshTokens.userId, users.id))
      .where(eq(refreshTokens.tokenHash, hashToken(incomingToken)))
      .limit(1);

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    const newRefreshToken = generateRefreshToken();

    // revoke the old one and issue the new one together, so you never end up with half of it
    await db.transaction(async (tx) => {
      await tx
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens._id, stored._id));

      await tx.insert(refreshTokens).values({
        userId: stored.userId,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: getRefreshTokenExpiryDate(),
      });
    });

    const accessToken = generateAccessToken({
      userId: stored.userId,
      email: stored.email,
    });

    return res.status(200).json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const LogoutUser = async (req: Request, res: Response) => {
  try {
    const incomingToken = req.headers["x-refresh-token"] as string | undefined;

    if (incomingToken) {
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.tokenHash, hashToken(incomingToken)));
    }

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};