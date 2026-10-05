import { type Request, type Response } from "express";
import { eq, inArray, or, desc } from "drizzle-orm";

import { db } from "../db";
import { deviceUsers, events } from "../db/schema";

export const getMyEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Find all devices previously associated with this user
    const deviceMappings = await db
      .select({
        deviceId: deviceUsers.deviceId,
      })
      .from(deviceUsers)
      .where(eq(deviceUsers.userId, userId));

    const deviceIds = deviceMappings.map(
      (mapping) => mapping.deviceId,
    );

    const conditions = [
      eq(events.userId, userId),
    ];

    if (deviceIds.length > 0) {
      conditions.push(
        inArray(events.deviceId, deviceIds),
      );
    }

    const userEvents = await db
      .select()
      .from(events)
      .where(or(...conditions))
      .orderBy(desc(events.occurredAt));

    return res.status(200).json({
      events: userEvents,
    });
  } catch (error) {
    console.error("Failed to fetch user events:", error);

    return res.status(500).json({
      message: "Failed to fetch user events",
    });
  }
};