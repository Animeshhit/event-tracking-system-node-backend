export const EVENTS = {
  PRODUCT_VIEW: "product_view",
  SEARCH: "search",
  CATEGORY_CLICK: "category_click",
  ADD_TO_CART: "add_to_cart",
  REMOVE_FROM_CART: "remove_from_cart",
  BUY_NOW: "buy_now",
  WISHLIST: "wishlist",
  CHECKOUT: "checkout",
  PAYMENT: "payment",
  PURCHASE: "purchase",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export const ALLOWED_EVENTS = Object.values(EVENTS);