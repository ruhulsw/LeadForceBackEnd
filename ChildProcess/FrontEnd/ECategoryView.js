const Product = require("../../models/addProduct");
const CategoryMessage = require("../../models/category");
const TopProducts = require("../../models/TopProductOrder");
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

process.on("message", async (categoryId) => {
  try {
    const categoryData = await redisClient.get(`CategoryView-${categoryId}`);
    if (categoryData != null) {
      console.log("==>> CacheCategoryView");

      process.send(JSON.parse(categoryData));
      mongooseClose();
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    } else {
      const message = await CategoryMessage.findOne({ _id: categoryId });

      const topOrder = await getTopProducts(categoryId);
      const category = await Product.find({ category: categoryId });

      const data = [];
      for (const productId of topOrder) {
        const product = category.find(
          (item) => item._id.toString() === productId.toString()
        );
        if (product) {
          data.push(formatProduct(product));
        }
      }

      for (const product of category) {
        if (!topOrder.includes(product._id.toString())) {
          data.push(formatProduct(product));
        }
      }

      await redisClient.set(
        `CategoryView-${categoryId}`,
        JSON.stringify({ data, message: message.message })
      );
      process.send({ data, message: message.message });
      mongooseClose();
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    }
  } catch (error) {
    console.log(error);
  }
});

async function getTopProducts(categoryId) {
  try {
    const topOrder = await TopProducts.findOne({ categoryId });
    if (!topOrder) {
      return [];
    }
    return topOrder.products;
  } catch (error) {
    console.error("Error fetching top products:", error);
    throw error;
  }
}

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
