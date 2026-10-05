import {
  type Request,
  type Response,
} from "express";

import { db } from "../db";
import { events } from "../db/schema";

import { validateEvent } from "../lib/validations/eventValidations";

export const createAEvent = async (
  req: Request,
  res: Response,
) => {
  try {
    // --------------------------------
    // Device ID
    // --------------------------------

    const deviceId =
      req.cookies?.device_id;

    if (!deviceId) {
      return res.status(400).json({
        message: "Device ID is missing",
      });
    }

   

    const userId =
      req.userId ?? null;

    // --------------------------------
    // Validate event
    // --------------------------------

    const validation =
      validateEvent(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.message,
      });
    }

    const {
      eventName,
      sessionId,
      productId,
      properties,
      occurredAt,
    } = validation.data;

  

    const [event] = await db
      .insert(events)
      .values({
        eventName,

        deviceId,

        sessionId,

        // NULL for guest users
        // Actual UUID for logged-in users
        userId,

        productId,

        properties,

        occurredAt,
      })
      .returning();

    return res.status(201).json({
      message: "Event stored successfully",
      event,
    });
  } catch (error) {
    console.error(
      "Event tracking error:",
      error,
    );

    return res.status(500).json({
      message: "Failed to store event",
    });
  }
};