import { redis } from "../config/redis";
import { EVENT_STREAM } from "../queue/event.queue";
import {
  createEvents,
  type CreateEventInput,
} from "../services/event.service";

const CONSUMER_GROUP = "event-workers";
const CONSUMER_NAME = `worker-${process.pid}`;

const BATCH_SIZE = 100;

// A message must be idle for 30 seconds before
// another worker can claim it.
const CLAIM_IDLE_TIME = 30_000;

const BLOCK_TIME = 1_000;

type RedisStreamMessage = [
  messageId: string,
  fields: string[],
];

type RedisStreamResponse = [
  streamName: string,
  messages: RedisStreamMessage[],
][];

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

const parseEvent = (
  fields: string[],
): CreateEventInput => {
  const dataIndex = fields.indexOf("data");

  if (dataIndex === -1) {
    throw new Error(
      "Redis message does not contain event data",
    );
  }

  const rawData = fields[dataIndex + 1];

  if (!rawData) {
    throw new Error(
      "Redis message contains empty event data",
    );
  }

  const parsed: unknown = JSON.parse(rawData);

  if (!isCreateEventInput(parsed)) {
    throw new Error(
      "Invalid event received from Redis",
    );
  }

  return parsed;
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

const acknowledgeMessages = async (
  messageIds: string[],
): Promise<void> => {
  if (messageIds.length === 0) {
    return;
  }

  await redis.xack(
    EVENT_STREAM,
    CONSUMER_GROUP,
    ...messageIds,
  );
};

const processMessages = async (
  messages: RedisStreamMessage[],
): Promise<void> => {
  if (messages.length === 0) {
    return;
  }

  const events: CreateEventInput[] = [];

  for (const [, fields] of messages) {
    const event = parseEvent(fields);
    events.push(event);
  }

  try {
    const insertedEvents = await createEvents(events);

    await acknowledgeMessages(
      messages.map(([messageId]) => messageId),
    );

   console.log(
  `[${CONSUMER_NAME}] Processed ${insertedEvents.length}/${events.length} events`,
);
  } catch (error) {
    console.error(
      "Failed to persist event batch:",
      error,
    );

    // Do NOT ACK.
    //
    // Redis keeps these messages pending.
    // They can be recovered later.
  }
};

const recoverPendingMessages = async (): Promise<void> => {
  let startId = "0-0";

  while (true) {
    const result = await redis.xautoclaim(
      EVENT_STREAM,
      CONSUMER_GROUP,
      CONSUMER_NAME,
      CLAIM_IDLE_TIME,
      startId,
      "COUNT",
      BATCH_SIZE,
    );

    const nextStartId = result[0] as string;
    const messages = result[1] as RedisStreamMessage[];

    startId = nextStartId;

    if (messages.length > 0) {
      console.log(
        `Recovered ${messages.length} pending events`,
      );

      await processMessages(messages);
    }

    // Redis returns "0-0" when there are no more
    // pending messages to scan.
    if (nextStartId === "0-0") {
      break;
    }
  }
};

const processNewMessages = async (): Promise<void> => {
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
    await processMessages(messages);
  }
};

const startWorker = async (): Promise<void> => {
  await ensureConsumerGroup();

  console.log(
    `Event worker started: ${CONSUMER_NAME}`,
  );

  while (true) {
    try {
      // First recover messages abandoned by
      // previously crashed workers.
      await recoverPendingMessages();

      // Then process new messages.
      await processNewMessages();
    } catch (error) {
      console.error(
        "Worker error:",
        error,
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 1_000),
      );
    }
  }
};

void startWorker();