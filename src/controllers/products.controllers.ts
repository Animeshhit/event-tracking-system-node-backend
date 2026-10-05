import { type Request,type Response } from "express";
import { db } from "../db";
import {products} from "../db/schema"

import { validate as isUuid } from "uuid"; 
import { eq } from "drizzle-orm";


export const getAllProducts = async (req:Request, res:Response) => {
  try {
    let productsFromDb = await db.select().from(products);
    res.json(productsFromDb).status(200);
  } catch (err) {
    console.log(err);
    res.json({ message: "internal server error " }).status(500);
  }
};

export const getAProduct = async (req:Request, res:Response) => {
  try {
    const productId = req.params.id;

    //due to typescript error
    if (typeof productId !== "string" || !isUuid(productId)) {
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
}

