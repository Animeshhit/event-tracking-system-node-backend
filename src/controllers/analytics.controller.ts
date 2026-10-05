import { type Request, type Response } from "express";
import { and, count, desc, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import { isUUID } from "validator";

import { db } from "../db";
import { events } from "../db/schema";
import { ALLOWED_EVENTS } from "../constants/AllowedEvents";
import { sql } from "drizzle-orm";

import { lt } from "drizzle-orm";

// ====================event analytics=================
export const getEventAnalytics = async (req: Request, res: Response) => {
  try {
    const { eventName, productId, from, to, guest } = req.query;

    const conditions = [];

    // Event filter
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

    // Product filter
    if (productId !== undefined) {
      if (typeof productId !== "string" || !isUUID(productId)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      conditions.push(eq(events.productId, productId));
    }

    // From date
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

    // To date
    if (to !== undefined) {
      if (typeof to !== "string") {
        return res.status(400).json({
          message: "Invalid to date",
        });
      }

    const toDate = new Date(`${to}T00:00:00`);

if (Number.isNaN(toDate.getTime())) {
  return res.status(400).json({
    message: "Invalid to date",
  });
}


toDate.setDate(toDate.getDate() + 1);

conditions.push(
  lt(events.occurredAt, toDate),
);
    }

    // Guest / logged-in filter
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

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;

    // Event counts
    const eventCounts = await db
      .select({
        eventName: events.eventName,
        count: count(),
      })
      .from(events)
      .where(whereCondition)
      .groupBy(events.eventName)
      .orderBy(desc(count()));

    // Total events
    const totalResult = await db
      .select({
        totalEvents: count(),
      })
      .from(events)
      .where(whereCondition);

    const totalEvents = Number(totalResult?.[0]?.totalEvents ?? 0);

    return res.status(200).json({
      totalEvents: Number(totalEvents),
      events: eventCounts.map((event) => ({
        eventName: event.eventName,
        count: Number(event.count),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch event analytics:", error);

    return res.status(500).json({
      message: "Failed to fetch event analytics",
    });
  }
};

// ====================event funnel=================
export const getFunnelAnalytics = async (req: Request, res: Response) => {
  try {
    const { productId, from, to, guest } = req.query;

    const conditions = [];

    if (productId !== undefined) {
      if (typeof productId !== "string" || !isUUID(productId)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      conditions.push(eq(events.productId, productId));
    }

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

  const toDate = new Date(`${to}T00:00:00`);

  if (Number.isNaN(toDate.getTime())) {
    return res.status(400).json({
      message: "Invalid to date",
    });
  }

  toDate.setDate(toDate.getDate() + 1);

  conditions.push(
    lt(events.occurredAt, toDate),
  );
}

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;

    const funnelEvents = [
      "product_view",
      "add_to_cart",
      "buy_now",
      "checkout",
      "purchase",
    ] as const;

    const result = await db
      .select({
        eventName: events.eventName,
        count: count(),
      })
      .from(events)
      .where(whereCondition)
      .groupBy(events.eventName);

    const counts = Object.fromEntries(
      result.map((item) => [item.eventName, Number(item.count)]),
    );

    const productView = counts.product_view ?? 0;
    const addToCart = counts.add_to_cart ?? 0;
    const buyNow = counts.buy_now ?? 0;
    const checkout = counts.checkout ?? 0;
    const purchase = counts.purchase ?? 0;

    const conversionRate = (count: number) => {
      if (productView === 0) return 0;

      return Number(((count / productView) * 100).toFixed(2));
    };

    return res.status(200).json({
      funnel: [
        {
          step: "product_view",
          count: productView,
          conversionRate: 100,
        },
        {
          step: "add_to_cart",
          count: addToCart,
          conversionRate: conversionRate(addToCart),
        },
        {
          step: "buy_now",
          count: buyNow,
          conversionRate: conversionRate(buyNow),
        },
        {
          step: "checkout",
          count: checkout,
          conversionRate: conversionRate(checkout),
        },
        {
          step: "purchase",
          count: purchase,
          conversionRate: conversionRate(purchase),
        },
      ],
    });
  } catch (error) {
    console.error("Failed to fetch funnel analytics:", error);

    return res.status(500).json({
      message: "Failed to fetch funnel analytics",
    });
  }
};


// ====================event trends=================
export const getEventTrends = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      from,
      to,
      eventName,
      productId,
      guest,
    } = req.query;

    const conditions = [];

    // Event filter
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

    // Product filter
    if (productId !== undefined) {
      if (
        typeof productId !== "string" ||
        !isUUID(productId)
      ) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      conditions.push(eq(events.productId, productId));
    }

    // From
    if (from !== undefined) {
      if (typeof from !== "string") {
        return res.status(400).json({
          message: "Invalid from date",
        });
      }

      const date = new Date(from);

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          message: "Invalid from date",
        });
      }

      conditions.push(
        gte(events.occurredAt, date),
      );
    }

    // To
    if (to !== undefined) {
      if (typeof to !== "string") {
        return res.status(400).json({
          message: "Invalid to date",
        });
      }

      const date = new Date(to);

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          message: "Invalid to date",
        });
      }

      conditions.push(
        lte(events.occurredAt, date),
      );
    }

    // Guest / logged-in
    if (guest !== undefined) {
      if (
        guest !== "true" &&
        guest !== "false"
      ) {
        return res.status(400).json({
          message: "guest must be true or false",
        });
      }

      conditions.push(
        guest === "true"
          ? isNull(events.userId)
          : isNotNull(events.userId),
      );
    }

    const whereCondition =
      conditions.length > 0
        ? and(...conditions)
        : undefined;

    const dateExpression = sql<string>`
      DATE(${events.occurredAt})
    `;

    const results = await db
      .select({
        date: dateExpression,
        eventName: events.eventName,
        count: count(),
      })
      .from(events)
      .where(whereCondition)
      .groupBy(
        dateExpression,
        events.eventName,
      )
      .orderBy(dateExpression);

    return res.status(200).json({
      trends: results.map((item) => ({
        date: item.date,
        eventName: item.eventName,
        count: Number(item.count),
      })),
    });
  } catch (error) {
    console.error(
      "Failed to fetch event trends:",
      error,
    );

    return res.status(500).json({
      message: "Failed to fetch event trends",
    });
  }
};