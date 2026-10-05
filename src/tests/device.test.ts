import { describe, expect, it } from "bun:test";
import { getDeviceId } from "./device";

describe("getDeviceId", () => {
  it("reads from the device_id cookie", () => {
    const req = {
      cookies: { device_id: "cookie-device-123" },
      headers: {},
      body: {},
    } as any;

    expect(getDeviceId(req)).toBe("cookie-device-123");
  });

  it("reads from x-device-id header when cookie is missing", () => {
    const req = {
      cookies: {},
      headers: { "x-device-id": "header-device-456" },
      body: {},
    } as any;

    expect(getDeviceId(req)).toBe("header-device-456");
  });

  it("reads from deviceId body field when provided", () => {
    const req = {
      cookies: {},
      headers: {},
      body: { deviceId: "body-device-789" },
    } as any;

    expect(getDeviceId(req)).toBe("body-device-789");
  });
});
