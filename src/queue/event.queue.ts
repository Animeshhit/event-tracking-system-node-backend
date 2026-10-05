import { redis } from "../config/redis";
import type { CreateEventInput } from "../services/event.service";

export const EVENT_STREAM = "events";

export const enqueueEvent = async (
  event: CreateEventInput,
): Promise<string> => {
  const messageId = await redis.xadd(
    EVENT_STREAM,
    "*",
    "data",
    JSON.stringify(event),
  );

  if (!messageId) {
    throw new Error("Failed to enqueue event");
  }

  return messageId;
};