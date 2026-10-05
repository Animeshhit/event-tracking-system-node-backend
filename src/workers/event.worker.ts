import { redis } from "../config/redis";
import {
  EVENT_STREAM,
} from "../queue/event.queue";
import {
  createEvents,
  type CreateEventInput,
} from "../services/event.service";

const CONSUMER_GROUP = "event-workers";
const CONSUMER_NAME = `worker-${process.pid}`;

const BATCH_SIZE = 100;
const BLOCK_TIME = 1000;

type RedisStreamMessage = [
  messageId: string,
  fields: string[],
];

type RedisStreamResponse = [
  streamName: string,
  messages: RedisStreamMessage[],
][];

const parseEvent = (
  fields: string[],
): CreateEventInput => {
  const dataIndex = fields.indexOf("data");

  if (dataIndex === -1) {
    throw new Error(
      "Redis event message does not contain data",
    );
  }

  const rawData = fields[dataIndex + 1];

  if (!rawData) {
    throw new Error(
      "Redis event message contains empty data",
    );
  }

  const parsed: unknown = JSON.parse(rawData);

  if (!isCreateEventInput(parsed)) {
    throw new Error(
      "Invalid event data received from Redis",
    );
  }

  return parsed;
};

const isCreateEventInput = (
  value: unknown,
): value is CreateEventInput => {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const event = value as Record<string, unknown>;

  return (
    typeof event.eventId === "string" &&
    typeof event.eventName === "string" &&
    typeof event.deviceId === "string" &&
    typeof event.sessionId === "string" &&
    (typeof event.userId === "string" ||
      event.userId === null) &&
    typeof event.properties === "object" &&
    event.properties !== null &&
    (event.productId === undefined ||
      typeof event.productId === "string") &&
    (event.occurredAt === undefined ||
      typeof event.occurredAt === "string" ||
      event.occurredAt instanceof Date)
  );
};

const ensureConsumerGroup = async (): Promise<void> => {
  try {
    await redis.xgroup(
      "CREATE",
      EVENT_STREAM,
      CONSUMER_GROUP,
      "0",
      "MKSTREAM",
    );

    console.log(
      `Created consumer group: ${CONSUMER_GROUP}`,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("BUSYGROUP")
    ) {
      return;
    }

    throw error;
  }
};

const processEventBatch = async (): Promise<void> => {
  const response = await redis.xreadgroup(
    "GROUP",
    CONSUMER_GROUP,
    CONSUMER_NAME,
    "COUNT",
    BATCH_SIZE,
    "BLOCK",
    BLOCK_TIME,
    "STREAMS",
    EVENT_STREAM,
    ">",
  );

  if (!response) {
    return;
  }

  const streams =
    response as unknown as RedisStreamResponse;

  for (const [, messages] of streams) {
    if (messages.length === 0) {
      continue;
    }

    const events: CreateEventInput[] = [];

    for (const [, fields] of messages) {
      const event = parseEvent(fields);

      events.push(event);
    }

    try {
      const insertedEvents =
        await createEvents(events);

      await redis.xack(
        EVENT_STREAM,
        CONSUMER_GROUP,
        ...messages.map(([messageId]) => messageId),
      );

      console.log(
        `Processed ${insertedEvents.length}/${events.length} events`,
      );
    } catch (error) {
      console.error(
        "Failed to persist event batch:",
        error,
      );

      // IMPORTANT:
      // Do NOT ACK messages if PostgreSQL failed.
      //
      // They remain pending in Redis and can be
      // recovered/reprocessed later.
    }
  }
};

const startWorker = async (): Promise<void> => {
  await ensureConsumerGroup();

  console.log(
    `Event worker started: ${CONSUMER_NAME}`,
  );

  while (true) {
    try {
      await processEventBatch();
    } catch (error) {
      console.error(
        "Event worker error:",
        error,
      );

      // Prevent a tight infinite failure loop.
      await new Promise((resolve) =>
        setTimeout(resolve, 1000),
      );
    }
  }
};

void startWorker();