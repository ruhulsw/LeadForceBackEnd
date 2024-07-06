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

process.on("message", async ({ categoryId, userID, url }) => {
  try {
    const eSearch = await redisClient.get(`eSearch-${userID}`);
    if (eSearch != null) {
      console.log("==>> Cache eSearch");
      process.send(JSON.parse(eSearch));
      await mongooseClose();
      setTimeout(() => {
        process.exit(1);
      }, 2000);
      return;
    }

    const domain = await Domain.findOne({
      domain: process.env.TESTING === "yes" ? "rusubd.com" : url,
    });

    if (!domain) {
      process.send({ message: "No domain found.." });
      await mongooseClose();
      setTimeout(() => {
        process.exit(1);
      }, 2000);
      return;
    }

    const searchData = await Product.find({ uid: domain.uid });
    if (searchData.length > 0) {
      await redisClient.set(`eSearch-${userID}`, JSON.stringify(searchData));
      process.send(searchData);
    } else {
      process.send({ message: "No product found.." });
    }

    await mongooseClose();
    setTimeout(() => {
      process.exit(1);
    }, 2000);
  } catch (error) {
    console.error(error);
  }
});
