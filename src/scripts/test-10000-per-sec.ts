const API_URL = "http://localhost:8080/api/v1";

const TARGET_EVENTS_PER_SECOND = 10_000;
const TEST_DURATION_SECONDS = 10;

// Number of requests allowed to be in-flight simultaneously.
const CONCURRENCY = 500;

const productId = "7f8ef302-030c-4069-ad82-b0335f6a6f22";

const deviceId = `load-test-device-${crypto.randomUUID()}`;

const createEvent = () => ({
  eventId: crypto.randomUUID(),

  eventName: "product_view",

  deviceId,

  sessionId: `session-${crypto.randomUUID()}`,

  productId,

  properties: {
    source: "10k-rps-load-test",
  },

  occurredAt: new Date().toISOString(),
});

const sendEvent = async () => {
  const event = createEvent();

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
  console.log("\n==============================");
  console.log("10K EVENTS / SECOND LOAD TEST");
  console.log("==============================");

  console.log(`Target: ${TARGET_EVENTS_PER_SECOND} events/sec`);
  console.log(`Duration: ${TEST_DURATION_SECONDS}s`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Device ID: ${deviceId}`);

  const totalTargetEvents =
    TARGET_EVENTS_PER_SECOND *
    TEST_DURATION_SECONDS;

  console.log(
    `Total target events: ${totalTargetEvents}`,
  );

  let successful = 0;
  let failed = 0;

  const start = performance.now();

  let lastSecond = start;

  while (
    performance.now() - start <
    TEST_DURATION_SECONDS * 1000
  ) {
    const secondStart = performance.now();

    /*
     * Send exactly TARGET_EVENTS_PER_SECOND
     * during this one-second window.
     */
    let sentThisSecond = 0;

    while (
      sentThisSecond < TARGET_EVENTS_PER_SECOND &&
      performance.now() - secondStart < 1000
    ) {
      const remaining =
        TARGET_EVENTS_PER_SECOND -
        sentThisSecond;

      const batchSize = Math.min(
        CONCURRENCY,
        remaining,
      );

      const batch = Array.from(
        { length: batchSize },
        sendEvent,
      );

      const results =
        await Promise.allSettled(batch);

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

      sentThisSecond += batchSize;

      /*
       * Don't accidentally send more than
       * the target for this second.
       */
      if (
        performance.now() - secondStart >=
        1000
      ) {
        break;
      }
    }

    const elapsed =
      (performance.now() - secondStart) / 1000;

    const actualRate =
      sentThisSecond / elapsed;

    console.log(
      `Second complete | Sent: ${sentThisSecond} | ` +
        `Success: ${successful} | ` +
        `Failed: ${failed} | ` +
        `Rate: ${actualRate.toFixed(0)} events/sec`,
    );

    /*
     * If the server finished the batch early,
     * wait until the one-second window finishes.
     */
    const remainingTime =
      1000 -
      (performance.now() - secondStart);

    if (remainingTime > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, remainingTime),
      );
    }

    lastSecond = performance.now();
  }

  const end = performance.now();

  const durationSeconds =
    (end - start) / 1000;

  const totalRequests =
    successful + failed;

  const actualThroughput =
    totalRequests / durationSeconds;

  console.log("\n==============================");
  console.log("LOAD TEST COMPLETE");
  console.log("==============================");

  console.log(
    `Target throughput: ${TARGET_EVENTS_PER_SECOND} events/sec`,
  );

  console.log(
    `Actual throughput: ${actualThroughput.toFixed(
      2,
    )} events/sec`,
  );

  console.log(
    `Total requests: ${totalRequests}`,
  );

  console.log(
    `Successful: ${successful}`,
  );

  console.log(
    `Failed: ${failed}`,
  );

  console.log(
    `Duration: ${durationSeconds.toFixed(2)}s`,
  );

  console.log(
    `Success rate: ${(
      (successful / totalRequests) *
      100
    ).toFixed(2)}%`,
  );

  console.log(
    `Target achieved: ${
      actualThroughput >=
      TARGET_EVENTS_PER_SECOND
        ? "YES"
        : "NO"
    }`,
  );

  if (failed > 0) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});