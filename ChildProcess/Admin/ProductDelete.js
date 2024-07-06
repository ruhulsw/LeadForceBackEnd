const { to } = require("await-to-js");
const Product = require("../../models/addProduct");
const Domain = require("../../models/domain");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const redis = require("redis");

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

process.on("message", async (id) => {
  const getData = await Product.findById({ _id: id });
  const url = await Domain.findOne({ uid: getData.uid });

  const SingleProduct = await redisClient.del(id);
  const ProductCache = await redisClient.del(`prosucts-${url.domain}`);
  const CategoryCache = await redisClient.del(`category-${url.domain}`);
  const CategoryViewCache = await redisClient.del(
    `CategoryView-${getData.category}`
  );
  const RelatedProductCache = await redisClient.del(
    `related-${getData.category}-`
  );

  console.log(
    "ProsuctCache",
    ProductCache,
    "CategoryCache",
    CategoryCache,
    "CategoryViewCache",
    CategoryViewCache,
    "RelatedProductCache",
    RelatedProductCache,
    "SingleProduct",
    SingleProduct
  );

  if (getData === null) {
    process.send("No data to delete");
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 1000);
  }
  let err, product;
  [err, product] = await to(Product.deleteOne({ _id: id }));
  process.send(product);
  setTimeout(() => {
    mongooseClose();
    process.exit(1);
  }, 1000);
});
