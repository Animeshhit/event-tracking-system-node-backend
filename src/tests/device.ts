import type { Request } from "express";

const normalizeDeviceId = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    return normalizeDeviceId(value[0]);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
};

export const getDeviceId = (req: Request): string | null => {
  const candidates = [
    req.cookies?.device_id,
    req.cookies?.deviceId,
    req.headers["x-device-id"],
    req.headers["device-id"],
    (req.body as Record<string, unknown> | undefined)?.device_id,
    (req.body as Record<string, unknown> | undefined)?.deviceId,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeDeviceId(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};
