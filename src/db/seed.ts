import { db} from "./index";
import { products } from "./schema/index";

await db.insert(products).values([
  {
    name: "Running Shoes",
    priceMinor: 499900,
    currency: "INR",
    imageUrl: "/products/shoes.jpg",
  },
  {
    name: "Hoodie",
    priceMinor: 199900,
    currency: "INR",
    imageUrl: "/products/hoodie.jpg",
  },
  {
    name: "Smart Watch",
    priceMinor: 299900,
    currency: "INR",
    imageUrl: "/products/watch.jpg",
  },
]);

