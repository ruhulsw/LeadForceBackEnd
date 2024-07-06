const { to } = require("await-to-js");
const Product = require("../../models/addProduct");
const Domain = require("../../models/domain");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const redis = require("redis");
const { AllCacheClean } = require("../../controllars/CacheClean");

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

process.on("message", async (data) => {
  await redisClient.del(data.id);
  await redisClient.del(`SProduct-${data.id}`);

  const {
    productName,
    productDesc,
    offerMessage,
    buyPrice,
    sellingPrice,
    colorName,
    quantity,
    imageUrl,
    images,
    showOrderNow,
    categorys,
    RelatedProduct,
    category,
    variation,
    variationData,
    pCode,
    compare,
    productPage,
    Trending,
    HotDeal,
  } = data.body;

  const getData = await Product.findById({ _id: data.id });

  if (getData === null) {
    process.send("No product found");
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 1000);
  }

  let err, respon;
  [err, respon] = await to(
    Product.updateOne(
      { _id: data.id },
      {
        $set: {
          productName: productName ? productName : getData.productName,
          productDec: productDesc ? productDesc : getData.productDec,
          offerMessage: offerMessage ? offerMessage : getData.offerMessage,
          priceBuy: buyPrice ? buyPrice : getData.buyPrice,
          proceSell: sellingPrice ? sellingPrice : getData.sellingPrice,
          color: colorName ? colorName : getData.colorName,
          quantity: colorName === "no" ? "" : quantity,
          imgeUrl: imageUrl ? imageUrl : getData.imgeUrl,
          category: category ? category : getData.category,
          variationData: variationData ? variationData : getData.variationData,
          variation: variation ? variation : getData.variation,
          pCode: pCode ? pCode : getData.pCode,
          compare: compare ? compare : getData.compare,
          productPage: productPage ? productPage : getData.productPage,
          images: images ? images : getData.images,
          showOrderNow: showOrderNow ? showOrderNow : getData.showOrderNow,
          categorys: categorys ? categorys : getData.categorys,
          RelatedProduct: RelatedProduct
            ? RelatedProduct
            : getData.RelatedProduct,
          Trending: Trending ? Trending : getData.Trending,
          HotDeal: HotDeal ? HotDeal : getData.HotDeal,
        },
      }
    )
  );
  AllCacheClean(getData.uid);
  process.send({ message: "Product updated to database" });
  setTimeout(() => {
    mongooseClose();
    process.exit(1);
  }, 1000);
});
