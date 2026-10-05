import { type Request, type Response } from "express";
import { db } from "../db";
import { events } from "../db/schema";

export const createAEvent = async (req: Request, res: Response) => {
  try {
    const {
      eventName,
      sessionId,
      productId,
      properties = {},
      occurredAt,
    } = req.body;

    const deviceId = req.cookies.device_id;
    const userId = req.userId;

    if (!deviceId) {
      return res.status(400).json({
        message: "Device ID is missing",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        message: "Session ID is missing",
      });
    }

    if (!eventName) {
      return res.status(400).json({
        message: "Event name is missing",
      });
    }

    const [event] = await db
      .insert(events)
      .values({
        eventName,
        deviceId,
        sessionId,
        userId: userId ?? null,
        productId,
        properties,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      })
      .returning();

    return res.status(201).json({
      message: "Event stored successfully",
      event,
    });
  } catch (error) {
    console.error("Event tracking error:", error);

    return res.status(500).json({
      message: "Failed to store event",
    });
  }
};
