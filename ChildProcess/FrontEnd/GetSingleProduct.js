const { to } = require("await-to-js");
const Product = require("../../models/addProduct");
const redis = require("redis");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

//============MongoDB=================
const { connection } = mongoose;
const URI = process.env.DB_URL;
const OPTS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
mongoose.connect(URI, OPTS);
//============MongoDB=================END

async function mongooseClose() {
  connection.close();
}

let redisClient;
(async () => {
  redisClient = redis.createClient();
  redisClient.on("error", (error) => console.error(`Error : ${error}`));
  await redisClient.connect();
})();

process.on("message", async (paramsId) => {
  let err, product;

  const CacheSProduct = await redisClient.get(`SProduct-${paramsId}`);
  if (CacheSProduct) {
    product = JSON.parse(CacheSProduct);
  } else {
    [err, product] = await to(Product.findOne({ _id: paramsId }));
    if (product === null || !product) {
      process.send("No product found..");
      mongooseClose();
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    }
    await redisClient.set(`SProduct-${paramsId}`, JSON.stringify(product));
  }

  if (product.variation === "colorSize") {
    const VariationData = [];
    product.variationData.map((data) => {
      data.sizes.map((sizeData) => {
        const obj = {
          sizeName: sizeData.sizeName,
          price: sizeData.price,
          quantity: sizeData.quantity,
          gid: data.gid,
        };
        VariationData.push(obj);
      });
    });

    const productData = {
      productName: product.productName,
      productDec: product.productDec,
      offerMessage: product.offerMessage,
      proceSell: product.proceSell,
      imgeUrl: product.imgeUrl,
      images: product.images,
      RelatedProduct: product.RelatedProduct,
      category: product.category,
      variation: product.variation,
      productStatus: product.productStatus,
      VariationData: product.variationData,
      pCode: product.pCode,
      compare: product.compare,
      id: product._id,
    };
    process.send(productData);
    mongooseClose();
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  }

  if (product.variation === "color") {
    const VariationData = [];
    product.variationData.map((data) => {
      const obj = {
        colorName: data.colorName,
        price: data.price,
        quantity: data.quantity,
        image: data.image,
        images: product.images,
        RelatedProduct: product.RelatedProduct,
        gid: data.gid,
        ShipFrom: data.ShipFrom,
        DeliveryTime: data.DeliveryTime,
        PriceCompare: data.PriceCompare,
      };
      VariationData.push(obj);
    });
    const productData = {
      productName: product.productName,
      productDec: product.productDec,
      offerMessage: product.offerMessage,
      proceSell: product.proceSell,
      imgeUrl: product.imgeUrl,
      images: product.images,
      RelatedProduct: product.RelatedProduct,
      category: product.category,
      variation: product.variation,
      productStatus: product.productStatus,
      VariationData,
      pCode: product.pCode,
      compare: product.compare,
      id: product._id,
      gid: product.gid,
    };
    process.send(productData);
    mongooseClose();
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  }
  if (product.variation === "no") {
    const productData = {
      productName: product.productName,
      productDec: product.productDec,
      offerMessage: product.offerMessage,
      proceSell: product.proceSell,
      imgeUrl: product.imgeUrl,
      images: product.images,
      RelatedProduct: product.RelatedProduct,
      category: product.category,
      variation: product.variation,
      color: product.color,
      productStatus: product.productStatus,
      pCode: product.pCode,
      compare: product.compare,
      id: product._id,
      gid: product.gid,
      quantity: product.quantity,
    };
    process.send(productData);
    mongooseClose();
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  }
});
