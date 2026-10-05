import { type Request, type Response } from "express";

import { db } from "../db";
import { events,deviceUsers } from "../db/schema";

import { validateEvent } from "../lib/validations/eventValidations";

import { and, count, desc, eq, gte, isNotNull, isNull, lte ,inArray, or,} from "drizzle-orm";
import { isUUID } from "validator";

import { ALLOWED_EVENTS } from "../constants/AllowedEvents";
import { enqueueEvent } from "../queue/event.queue";


export const createAEvent = async (req: Request, res: Response) => {
  try {
    // --------------------------------
    // Device ID
    // --------------------------------

    const deviceId = req.cookies?.device_id;

    if (!deviceId) {
      return res.status(400).json({
        message: "Device ID is missing",
      });
    }

    const userId = req.userId ?? null;

    // --------------------------------
    // Validate event
    // --------------------------------

    const validation = validateEvent(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.message,
      });
    }

    const { eventName, sessionId, productId, properties, occurredAt, eventId } =
      validation.data;

    // --------------------------------
    // Insert event
    // --------------------------------

    await enqueueEvent({
      eventId,
      eventName,
      deviceId,
      sessionId,
      userId,
      productId,
      properties,
      occurredAt,
    });

    return res.status(202).json({
      message: "Event accepted",
    });
  } catch (error) {
    console.error("Event tracking error:", error);

    return res.status(500).json({
      message: "Failed to store event",
    });
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    const {
      page: pageQuery,
      limit: limitQuery,
      eventName,
      productId,
      from,
      to,
      guest,
      userId,
      deviceId,
    } = req.query;

    // --------------------------------
    // Pagination
    // --------------------------------

    const page = Number(pageQuery ?? 1);
    const limit = Number(limitQuery ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        message: "Invalid page",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        message: "Limit must be between 1 and 100",
      });
    }

    const offset = (page - 1) * limit;

    // --------------------------------
    // Filters
    // --------------------------------

    const conditions = [];

    // --------------------------------
    // User ID
    // --------------------------------


    console.log("USER ID FROM QUERY:", userId);
console.log("DEVICE ID FROM QUERY:", deviceId);
   if (userId !== undefined) {
  if (typeof userId !== "string" || !isUUID(userId)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  const linkedDevices = await db
    .select({
      deviceId: deviceUsers.deviceId,
    })
    .from(deviceUsers)
    .where(eq(deviceUsers.userId, userId));

  const deviceIds = linkedDevices.map(
    ({ deviceId }) => deviceId,
  );

  console.log("USER ID:", userId);
  console.log("LINKED DEVICES:", deviceIds);

  if (deviceIds.length > 0) {
    conditions.push(
      or(
        eq(events.userId, userId),
        and(
          inArray(events.deviceId, deviceIds),
          isNull(events.userId),
        ),
      ),
    );
  } else {
    conditions.push(eq(events.userId, userId));
  }
}

    // --------------------------------
    // Event name
    // --------------------------------

    if (eventName !== undefined) {
      if (
        typeof eventName !== "string" ||
        !ALLOWED_EVENTS.includes(eventName as any)
      ) {
        return res.status(400).json({
          message: "Invalid event name",
        });
      }

      conditions.push(eq(events.eventName, eventName));
    }

    // --------------------------------
    // Product ID
    // --------------------------------

    if (productId !== undefined) {
      if (typeof productId !== "string" || !isUUID(productId)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      conditions.push(eq(events.productId, productId));
    }

    // --------------------------------
    // Date filters
    // --------------------------------

    if (from !== undefined) {
      if (typeof from !== "string") {
        return res.status(400).json({
          message: "Invalid from date",
        });
      }

      const fromDate = new Date(from);

      if (Number.isNaN(fromDate.getTime())) {
        return res.status(400).json({
          message: "Invalid from date",
        });
      }

      conditions.push(gte(events.occurredAt, fromDate));
    }

    if (to !== undefined) {
      if (typeof to !== "string") {
        return res.status(400).json({
          message: "Invalid to date",
        });
      }

      const toDate = new Date(to);

      if (Number.isNaN(toDate.getTime())) {
        return res.status(400).json({
          message: "Invalid to date",
        });
      }

      conditions.push(lte(events.occurredAt, toDate));
    }

    // --------------------------------
    // Guest / logged-in filter
    // --------------------------------

    if (guest !== undefined) {
      if (guest !== "true" && guest !== "false") {
        return res.status(400).json({
          message: "guest must be true or false",
        });
      }

      if (guest === "true") {
        conditions.push(isNull(events.userId));
      } else {
        conditions.push(isNotNull(events.userId));
      }
    }

    // --------------------------------
    // Query
    // --------------------------------

    const whereCondition =
      conditions.length > 0
        ? and(...conditions)
        : undefined;

    const results = await db
      .select()
      .from(events)
      .where(whereCondition)
      .orderBy(desc(events.occurredAt))
      .limit(limit)
      .offset(offset);

    // --------------------------------
    // Total count
    // --------------------------------

    const [row] = await db
      .select({
        total: count(),
      })
      .from(events)
      .where(whereCondition);

    const total = row?.total ?? 0;

    return res.status(200).json({
      events: results,

      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch events:", error);

    return res.status(500).json({
      message: "Failed to fetch events",
    });
  }
};