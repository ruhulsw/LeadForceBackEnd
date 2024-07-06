const Product = require("../../models/addProduct");
const Domain = require("../../models/domain");
const redis = require("redis");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

//============MongoDB=================START
const { connection } = mongoose;
const URI = process.env.DB_URL;
const OPTS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
mongoose.connect(URI, OPTS);
//============MongoDB=================END

async function mongooseClose() {
  await connection.close();
}

let redisClient;
(async () => {
  redisClient = redis.createClient();
  redisClient.on("error", (error) => console.error(`Error : ${error}`));
  await redisClient.connect();
})();

process.on("message", async ({ deal, url }) => {
  try {
    const effectiveUrl = process.env.TESTING === "yes" ? "rusubd.com" : url;
    const cacheKey = `DealView-${deal}-${effectiveUrl}`;
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData != null) {
      console.log("==>> CacheDealView");
      process.send(JSON.parse(cachedData));
      await mongooseClose();
      setTimeout(() => {
        process.exit(1);
      }, 2000);
      return;
    }

    const domain = await Domain.findOne({ domain: effectiveUrl });
    let products;

    if (deal === "HotDeal") {
      products = await Product.find({ HotDeal: "1", uid: domain.uid });
    } else if (deal === "TrendingNow") {
      products = await Product.find({ Trending: "1", uid: domain.uid });
    } else if (deal === "NewArrival") {
      products = await Product.find({ uid: domain.uid })
        .sort({ updateDate: -1 })
        .limit(20);
    }

    const formattedProducts = products.map(formatProduct);

    await redisClient.set(cacheKey, JSON.stringify(formattedProducts));
    process.send(formattedProducts);

    await mongooseClose();
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  } catch (error) {
    console.error(error);
  }
});

function formatProduct(product) {
  return {
    name: product.productName,
    imgUrl: product.imgeUrl,
    images: product.images,
    id: product._id,
    proceSell: product.proceSell,
    quantity: product.quantity,
    compare: product.compare,
    variationData: product.variationData,
    variation: product.variation,
    colorName: product.color,
    productPage: product.productPage,
    showOrderNow: product.showOrderNow,
  };
}
