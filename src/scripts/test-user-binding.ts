const API_URL = "http://localhost:8080/api/v1";

const deviceId = `test-device-${crypto.randomUUID()}`;
const sessionId = `test-session-${crypto.randomUUID()}`;

const email = `test-${crypto.randomUUID()}@example.com`;
const password = "Test@123456";

const log = (message: string) => {
  console.log(`\n${message}`);
};

const request = async (
  url: string,
  options: RequestInit = {},
): Promise<any> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
      Cookie: `device_id=${deviceId}`,
    },
  });

  const text = await response.text();

  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}\n${JSON.stringify(body, null, 2)}`,
    );
  }

  return body;
};

const main = async () => {
  // --------------------------------------------
  // 1. Create guest event
  // --------------------------------------------

  log("1. Creating guest event...");

  const guestEventId = crypto.randomUUID();

  await request(`${API_URL}/events`, {
    method: "POST",
    body: JSON.stringify({
      eventId: guestEventId,
      eventName: "product_view",
      sessionId,
      productId: "7f8ef302-030c-4069-ad82-b0335f6a6f22",
      properties: {},
      occurredAt: new Date().toISOString(),
    }),
  });

  console.log("Guest event created:", guestEventId);

  // --------------------------------------------
  // 2. Register user
  // --------------------------------------------

  log("2. Registering user...");

  const registerResponse = await request(`${API_URL}/auth/register`, {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      name:"test-name"
    }),
  });

  console.log("User registered:", registerResponse);

  // --------------------------------------------
  // 3. Login
  // --------------------------------------------

  log("3. Logging in...");

  const loginResponse = await request(`${API_URL}/auth/login`, {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });

  console.log("Login successful");

  /*
   * IMPORTANT:
   *
   * If your login response returns the access token
   * instead of relying entirely on cookies, store it here
   * and send it in Authorization headers below.
   */

  // --------------------------------------------
  // 4. Query events for user
  // --------------------------------------------

  log("4. Fetching events for user...");

  /*
   * Replace this with however your login response
   * exposes the user ID.
   */

  const userId = loginResponse.user?.id;

  if (!userId) {
    throw new Error(
      "Could not find userId in login response. Update the script according to your response shape.",
    );
  }

const eventsResponse = await request(
  `${API_URL}/events?userId=${userId}&limit=100`,
);

  console.log(
    "Events returned:",
    JSON.stringify(eventsResponse, null, 2),
  );

  // --------------------------------------------
  // 5. Verify guest event is present
  // --------------------------------------------

const events = eventsResponse.events ?? [];

  const guestEventFound = events.some(
    (event: any) => event.eventId === guestEventId,
  );

  if (!guestEventFound) {
    throw new Error(
      "FAILED: Historical guest event was not returned for the user.",
    );
  }

  console.log(
    "PASSED: Historical guest event is visible for the logged-in user.",
  );

  console.log("\nUSER BINDING TEST PASSED");
};

main().catch((error) => {
  console.error("\nUSER BINDING TEST FAILED");
  console.error(error);
  process.exit(1);
});