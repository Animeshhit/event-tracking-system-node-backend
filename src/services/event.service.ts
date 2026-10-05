import { db } from "../db";
import { events } from "../db/schema";

export type CreateEventInput = {
  eventId: string;
  eventName: string;
  deviceId: string;
  sessionId: string;
  userId: string | null;
  productId: string | null;
  properties: Record<string, unknown>;
  occurredAt?: Date;
};

export const createEvent = async (data: CreateEventInput) => {
  const [event] = await db
    .insert(events)
    .values({
      eventId: data.eventId,
      eventName: data.eventName,
      deviceId: data.deviceId,
      sessionId: data.sessionId,
      userId: data.userId,
      productId: data.productId,
      properties: data.properties,
      occurredAt: data.occurredAt,
    })
    .onConflictDoNothing({
      target: events.eventId,
    })
    .returning();

  return event ?? null;
};

export const createEvents = async (data: CreateEventInput[]) => {
  if (data.length === 0) {
    return [];
  }

  return db
    .insert(events)
    .values(data)
    .onConflictDoNothing({
      target: events.eventId,
    })
    .returning();
};