const API_URL = "http://localhost:8080/api/v1";

const TOTAL_EVENTS = 10_000;
const CONCURRENCY = 100;

const deviceId = `load-test-device-${crypto.randomUUID()}`;

const productId = "7f8ef302-030c-4069-ad82-b0335f6a6f22";

const createEvent = () => ({
  eventId: crypto.randomUUID(),

  eventName: "product_view",

  sessionId: `session-${crypto.randomUUID()}`,

  productId,

  properties: {
    source: "load-test",
  },

  occurredAt: new Date().toISOString(),
});

const sendEvent = async (event: ReturnType<typeof createEvent>) => {
  const response = await fetch(`${API_URL}/events`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      Cookie: `device_id=${deviceId}`,
    },

    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Request failed: ${response.status} ${body}`,
    );
  }

  return response.json();
};

const main = async () => {
  console.log(`Starting ${TOTAL_EVENTS} event test...`);

  const start = performance.now();

  let successful = 0;
  let failed = 0;

  for (
    let offset = 0;
    offset < TOTAL_EVENTS;
    offset += CONCURRENCY
  ) {
    const batch = Array.from(
      {
        length: Math.min(
          CONCURRENCY,
          TOTAL_EVENTS - offset,
        ),
      },
      createEvent,
    );

    const results = await Promise.allSettled(
      batch.map(sendEvent),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        successful++;
      } else {
        failed++;

        console.error(
          "Event failed:",
          result.reason,
        );
      }
    }

    console.log(
      `Progress: ${successful + failed}/${TOTAL_EVENTS}`,
    );
  }

  const end = performance.now();

  const durationSeconds = (end - start) / 1000;

  console.log("\n-----------------------------");
  console.log("LOAD TEST COMPLETE");
  console.log("-----------------------------");

  console.log(`Total events: ${TOTAL_EVENTS}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${durationSeconds.toFixed(2)}s`);

  console.log(
    `Request throughput: ${(
      TOTAL_EVENTS / durationSeconds
    ).toFixed(2)} events/sec`,
  );

  if (failed > 0) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});