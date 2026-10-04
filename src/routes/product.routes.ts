import { Router } from "express";

import { db } from "../db";
import { products } from "../db/schema";
import { eq } from "drizzle-orm";
import { validate as isUuid } from "uuid"; 


const ProductRouter = Router();

ProductRouter.get("/products", async (req, res) => {
  try {
    let productsFromDb = await db.select().from(products);
    res.json(productsFromDb).status(200);
  } catch (err) {
    console.log(err);
    res.json({ message: "internal server error " }).status(500);
  }
});


ProductRouter.get("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    if (!isUuid(productId)) {
      return res.status(400).json({ message: "invalid product id" });
    }

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return res.status(404).json({ message: "product not found" });
    }

    return res.status(200).json(product);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "internal server error" });
  }
});

export default ProductRouter;
