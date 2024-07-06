const HotCategory = require("../../models/CategorySelect");
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

async function handleHotCategoryRequest(url) {
  const cacheKey = `Hot-Category-${url}`;
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    console.log("==>> Cache Hot-Category");
    return JSON.parse(cachedData);
  } else {
    const queryDomain = process.env.TESTING === "yes" ? "rusubd.com" : url;

    const getDom = await Domain.findOne({ domain: queryDomain });

    const hotCategories = await HotCategory.find({ uid: getDom.uid }).sort({
      timestamp: -1,
    });

    await redisClient.set(cacheKey, JSON.stringify(hotCategories));
    return hotCategories;
  }
}

process.on("message", async (data) => {
  const { url } = data;
  const result = await handleHotCategoryRequest(url);
  process.send(result);

  setTimeout(async () => {
    await mongooseClose();
    process.exit(1);
  }, 2000);
});
