import { isUUID } from "validator";

import {
  ALLOWED_EVENTS,
  type EventName,
} from "../../constants/AllowedEvents";

type EventProperties = Record<string, unknown>;

type ValidateEventInput = {
         eventId: string;
  eventName: unknown;
  sessionId: unknown;
  productId?: unknown;
  properties?: unknown;
  occurredAt?: unknown;
};

type ValidatedEvent = {
    eventId:string;
  eventName: EventName;
  sessionId: string;
  productId: string | null;
  properties: EventProperties;
  occurredAt: Date;
};

type ValidationResult =
  | {
      success: true;
      data: ValidatedEvent;
    }
  | {
      success: false;
      message: string;
    };

export const validateEvent = (
  input: ValidateEventInput,
): ValidationResult => {
  const {
    eventName,
    sessionId,
    productId,
    properties = {},
    occurredAt,
    eventId
  } = input;

  // --------------------------------
  // Event name
  // --------------------------------

  if (
    typeof eventName !== "string" ||
    !eventName.trim()
  ) {
    return {
      success: false,
      message: "Event name is required",
    };
  }

  if (
    !ALLOWED_EVENTS.includes(
      eventName as EventName,
    )
  ) {
    return {
      success: false,
      message: "Invalid event name",
    };
  }

  if (
  typeof eventId !== "string" ||
  !isUUID(eventId)
) {
  return {
    success: false,
    message: "Invalid event ID",
  };
}

  // --------------------------------
  // Session ID
  // --------------------------------

  if (
    typeof sessionId !== "string" ||
    !sessionId.trim()
  ) {
    return {
      success: false,
      message: "Valid session ID is required",
    };
  }

  if (sessionId.length > 100) {
    return {
      success: false,
      message: "Session ID is too long",
    };
  }

  // --------------------------------
  // Product ID
  // --------------------------------

  let validatedProductId: string | null = null;

  if (
    productId !== undefined &&
    productId !== null
  ) {
    if (
      typeof productId !== "string" ||
      !isUUID(productId)
    ) {
      return {
        success: false,
        message: "Invalid product ID",
      };
    }

    validatedProductId = productId;
  }

  // --------------------------------
  // Properties
  // --------------------------------

  if (
    typeof properties !== "object" ||
    properties === null ||
    Array.isArray(properties)
  ) {
    return {
      success: false,
      message: "Properties must be an object",
    };
  }

  const validatedProperties =
    properties as EventProperties;

  // --------------------------------
  // occurredAt
  // --------------------------------

  let validatedOccurredAt = new Date();

  if (
    occurredAt !== undefined &&
    occurredAt !== null
  ) {
    if (typeof occurredAt !== "string") {
      return {
        success: false,
        message: "occurredAt must be a valid date",
      };
    }

    const date = new Date(occurredAt);

    if (Number.isNaN(date.getTime())) {
      return {
        success: false,
        message: "Invalid occurredAt",
      };
    }

    validatedOccurredAt = date;
  }

  // --------------------------------
  // Event-specific validation
  // --------------------------------

  switch (eventName as EventName) {
    case "product_view": {
      if (!validatedProductId) {
        return {
          success: false,
          message:
            "productId is required for product_view",
        };
      }

      break;
    }

    case "search": {
      const query =
        validatedProperties.query;

      if (
        typeof query !== "string" ||
        !query.trim()
      ) {
        return {
          success: false,
          message:
            "query is required for search",
        };
      }

      if (query.length > 200) {
        return {
          success: false,
          message: "Search query is too long",
        };
      }

      break;
    }

    case "category_click": {
      const categoryName =
        validatedProperties.categoryName;

      if (
        typeof categoryName !== "string" ||
        !categoryName.trim()
      ) {
        return {
          success: false,
          message:
            "categoryName is required for category_click",
        };
      }

      break;
    }

    case "add_to_cart": {
      if (!validatedProductId) {
        return {
          success: false,
          message:
            "productId is required for add_to_cart",
        };
      }

      const quantity =
        validatedProperties.quantity;

      if (
        typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return {
          success: false,
          message:
            "Valid quantity is required for add_to_cart",
        };
      }

      break;
    }

    case "remove_from_cart": {
      if (!validatedProductId) {
        return {
          success: false,
          message:
            "productId is required for remove_from_cart",
        };
      }

      const quantity =
        validatedProperties.quantity;

      if (
        typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return {
          success: false,
          message:
            "Valid quantity is required for remove_from_cart",
        };
      }

      break;
    }

    case "buy_now": {
      if (!validatedProductId) {
        return {
          success: false,
          message:
            "productId is required for buy_now",
        };
      }

      break;
    }

    case "wishlist": {
      if (!validatedProductId) {
        return {
          success: false,
          message:
            "productId is required for wishlist",
        };
      }

      break;
    }

    case "checkout": {
      const itemCount =
        validatedProperties.itemCount;

      if (
        typeof itemCount !== "number" ||
        !Number.isInteger(itemCount) ||
        itemCount <= 0
      ) {
        return {
          success: false,
          message:
            "Valid itemCount is required for checkout",
        };
      }

      break;
    }

    case "payment": {
      const amountMinor =
        validatedProperties.amountMinor;

      const status =
        validatedProperties.status;

      if (
        typeof amountMinor !== "number" ||
        !Number.isInteger(amountMinor) ||
        amountMinor < 0
      ) {
        return {
          success: false,
          message:
            "Valid amountMinor is required for payment",
        };
      }

      if (
        status !== "success" &&
        status !== "failure"
      ) {
        return {
          success: false,
          message:
            "Payment status must be success or failure",
        };
      }

      break;
    }

    case "purchase": {
      const orderId =
        validatedProperties.orderId;

      const amountMinor =
        validatedProperties.amountMinor;

      if (
        typeof orderId !== "string" ||
        !orderId.trim()
      ) {
        return {
          success: false,
          message:
            "orderId is required for purchase",
        };
      }

      if (
        typeof amountMinor !== "number" ||
        !Number.isInteger(amountMinor) ||
        amountMinor < 0
      ) {
        return {
          success: false,
          message:
            "Valid amountMinor is required for purchase",
        };
      }

      break;
    }

    default: {
      return {
        success: false,
        message: "Unsupported event",
      };
    }
  }

  // --------------------------------
  // Everything is valid
  // --------------------------------

  return {
    success: true,

    data: {
      eventName: eventName as EventName,
      sessionId,
      productId: validatedProductId,
      properties: validatedProperties,
      occurredAt: validatedOccurredAt,
      eventId,
    },
  };
};