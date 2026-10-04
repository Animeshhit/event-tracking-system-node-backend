
import { DB_URL } from "../../env";
import { products } from "../db/schema"; 
import { db } from "./index";

const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=500&h=500&fit=crop`;

type SeedProduct = {
  name: string;
  description: string;
  category: string;
  price: number; 
  originalPrice: number;
  rating: number; 
  ratingCount: number;
  stock: number;
  images: string[]; 
};

const seedData: SeedProduct[] = [
  {
    name: "Premium Wireless Headphones",
    description:
      "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
    category: "Electronics",
    price: 199.99,
    originalPrice: 299.99,
    rating: 4.8,
    ratingCount: 2543,
    stock: 45,
    images: [u("photo-1505740420928-5e560c06d30e")], // verified
  },
  {
    name: "Stainless Steel Water Bottle",
    description: "Durable 32oz water bottle keeps drinks cold for 24 hours.",
    category: "Sports",
    price: 34.99,
    originalPrice: 49.99,
    rating: 4.6,
    ratingCount: 1823,
    stock: 128,
    images: [
      u("photo-1602143407151-7111542de6e8"),
      u("photo-1610824352934-c10d87b700cc"),
      u("photo-1523362628745-0c100150b504"),
    ],
  },
  {
    name: "Organic Cotton T-Shirt",
    description:
      "Comfortable and sustainable 100% organic cotton t-shirt available in multiple colors.",
    category: "Apparel",
    price: 29.99,
    originalPrice: 39.99,
    rating: 4.5,
    ratingCount: 967,
    stock: 200,
    images: [u("photo-1521572163474-6864f9cf17ab")], // verified
  },
  {
    name: "Portable USB-C Charger",
    description: "Fast charging power bank with 65W output and dual ports.",
    category: "Electronics",
    price: 49.99,
    originalPrice: 79.99,
    rating: 4.7,
    ratingCount: 3421,
    stock: 89,
    images: [u("photo-1609091839311-d5365f9ff1c5")], // verified
  },
  {
    name: "Premium Yoga Mat",
    description:
      "Non-slip 6mm yoga mat made from eco-friendly natural rubber.",
    category: "Sports",
    price: 79.99,
    originalPrice: 99.99,
    rating: 4.6,
    ratingCount: 1234,
    stock: 67,
    images: [
      u("photo-1601925260368-ae2f83cf8b7f"),
      u("photo-1592432678016-e910b452f9a2"),
      u("photo-1575052814086-f385e2e2ad1b"),
    ],
  },
  {
    name: "Digital Smart Watch",
    description:
      "Feature-rich smartwatch with fitness tracking and 7-day battery life.",
    category: "Electronics",
    price: 149.99,
    originalPrice: 249.99,
    rating: 4.4,
    ratingCount: 2156,
    stock: 34,
    images: [u("photo-1523275335684-37898b6baf30")], // verified
  },
  {
    name: "Wireless Charging Pad",
    description: "Fast wireless charger compatible with all Qi-enabled devices.",
    category: "Electronics",
    price: 24.99,
    originalPrice: 39.99,
    rating: 4.5,
    ratingCount: 1876,
    stock: 156,
    images: [
      u("photo-1622445275576-721325763afe"),
      u("photo-1586816879360-004f5b0c51e5"),
      u("photo-1615526675159-e248c3021d3f"),
    ],
  },
  {
    name: "Minimalist Backpack",
    description:
      "Sleek and stylish backpack with multiple compartments and USB charging port.",
    category: "Accessories",
    price: 89.99,
    originalPrice: 129.99,
    rating: 4.7,
    ratingCount: 2341,
    stock: 58,
    images: [u("photo-1553062407-98eeb64c6a62")], // verified
  },
  {
    name: "LED Desk Lamp",
    description: "Adjustable LED lamp with 3 color modes and touch control.",
    category: "Home",
    price: 39.99,
    originalPrice: 59.99,
    rating: 4.6,
    ratingCount: 1543,
    stock: 112,
    images: [
      u("photo-1507473885765-e6ed057f782c"),
      u("photo-1534105615256-13940a56ff44"),
      u("photo-1513506003901-1e6a229e2d15"),
    ],
  },
  {
    name: "Bluetooth Speaker",
    description:
      "Portable waterproof speaker with 12-hour battery life and 360-degree sound.",
    category: "Electronics",
    price: 59.99,
    originalPrice: 89.99,
    rating: 4.8,
    ratingCount: 3892,
    stock: 73,
    images: [
      u("photo-1608043152269-423dbba4e7e1"),
      u("photo-1545454675-3531b543be5d"),
      u("photo-1558089687-f282ffcbc126"),
    ],
  },
  {
    name: "Mechanical Keyboard",
    description:
      "RGB mechanical keyboard with custom switches and programmable keys.",
    category: "Electronics",
    price: 129.99,
    originalPrice: 179.99,
    rating: 4.9,
    ratingCount: 2765,
    stock: 41,
    images: [
      u("photo-1587829741301-dc798b83add3"),
      u("photo-1595225476474-87563907a212"),
      u("photo-1618384887929-16ec33fab9ef"),
    ],
  },
  {
    name: "Eco-Friendly Water Bottle",
    description: "Reusable bamboo fiber water bottle, 500ml capacity.",
    category: "Sports",
    price: 22.99,
    originalPrice: 34.99,
    rating: 4.5,
    ratingCount: 876,
    stock: 234,
    images: [
      u("photo-1523362628745-0c100150b504"),
      u("photo-1536939459926-301728717817"),
      u("photo-1610824352934-c10d87b700cc"),
    ],
  },
];

async function imageWorks(url: string): Promise<boolean> {
  try {
    let res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    }
    const type = res.headers.get("content-type") ?? "";
    return res.ok && type.startsWith("image/");
  } catch {
    return false;
  }
}

async function pickImage(p: SeedProduct, used: Set<string>): Promise<string | null> {
  for (const url of p.images) {
    if (used.has(url)) continue; // keep every product's image unique
    if (await imageWorks(url)) return url;
    console.warn(`  ✗ broken: ${url}`);
  }
  return null;
}

async function main() {
  if (!DB_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("Checking images...");
  const used = new Set<string>();
  const rows: (typeof products.$inferInsert)[] = [];
  const failed: string[] = [];

  for (const p of seedData) {
    const image = await pickImage(p, used);
    if (!image) {
      failed.push(p.name);
      continue;
    }
    used.add(image);
    console.log(`  ✓ ${p.name}`);
    rows.push({
      name: p.name,
      description: p.description,
      category: p.category,
      priceMinor: Math.round(p.price * 100),
      originalPriceMinor: Math.round(p.originalPrice * 100),
      // `rating` is a bigint column, so it is stored x10 (4.8 -> 48).
      // Divide by 10 when displaying.
      rating: Math.round(p.rating * 10),
      ratingCount: p.ratingCount,
      stock: p.stock,
      image,
    });
  }

  if (failed.length) {
    console.error(
      `\nNo working image found for: ${failed.join(", ")}.\nNothing was inserted. Replace those URLs in seedData and run again.`,
    );
    process.exit(1);
  }

  

  try {
    await db.delete(products); 
    await db.insert(products).values(rows);
    console.log(`\nSeeded ${rows.length} products.`);
  } finally {

  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});