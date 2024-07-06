const Product = require("../../models/addProduct");
const Domain = require("../../models/domain");
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
  await connection.close();
}

let redisClient;
(async () => {
  redisClient = redis.createClient();
  redisClient.on("error", (error) => console.error(`Error : ${error}`));
  await redisClient.connect();
})();

async function handleRelatedProductRequest(req) {
  const url = req.url;
  const cacheKey = `Related-${req.id}-${
    [
      "rusubd.com",
      "store.rusubd.com",
      "sunglass.rusubd.com",
      "shop.rusubd.com",
      "jewelry.rusubd.com",
      "localhost:3000",
    ].includes(url)
      ? "rusubd.com"
      : url
  }`;

  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    console.log("==>> Cache Related Product");
    return JSON.parse(cachedData);
  } else {
    const queryDomain =
      process.env.TESTING === "yes" ||
      [
        "rusubd.com",
        "store.rusubd.com",
        "sunglass.rusubd.com",
        "shop.rusubd.com",
        "jewelry.rusubd.com",
        "localhost:3000",
      ].includes(url)
        ? "rusubd.com"
        : url;

    const getDom = await Domain.findOne({ domain: queryDomain });
    const products = await Product.find({
      uid: getDom.uid,
      category: req.id,
    }).sort({
      updateDate: -1,
    });

    await redisClient.set(cacheKey, JSON.stringify(products));
    return products;
  }
}

process.on("message", async (req) => {
  try {
    const result = await handleRelatedProductRequest(req);
    process.send(result);
  } catch (error) {
    console.error(`Error processing related product request: ${error}`);
    process.send({ error: error.message });
  } finally {
    setTimeout(async () => {
      await mongooseClose();
      process.exit(1);
    }, 2000);
  }
});
