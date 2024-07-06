const { to } = require("await-to-js");
const Order = require("../../models/order");
const Product = require("../../models/addProduct");
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

process.on("message", async (deleteid) => {
  const getData = await Order.findOne({ _id: deleteid });

  if (!getData || getData === null) {
    process.send("No order found to delete..");
    mongooseClose();
    setTimeout(() => {
      process.exit(1);
    }, 500);
  }

  if (
    getData.orderStatus == 5 ||
    getData.orderStatus == "5" ||
    getData.orderStatus == 6 ||
    getData.orderStatus == "6"
  ) {
    let errror, order;
    [errror, order] = await to(Order.deleteOne({ _id: deleteid }));
    process.send({ message: "Delete sucsessful" });
    mongooseClose();
    setTimeout(() => {
      process.exit(1);
    }, 500);
  } else {
    getData.orderData.map(async (product) => {
      const id = product.id;
      const qit = product.quantity;
      const colorName = product.colorName;
      const SizeName = product.Size;

      const SProduct1 = await redisClient.del(`SProduct-${product.id}`);
      console.log("Delete Single Product =>>>>>>>>", SProduct1);

      if (product.VariationType === "colorSize") {
        let errr, colorSize;
        [errr, colorSize] = await to(
          Product.findOne({ _id: id, "variationData.colorName": colorName })
        );

        if (!colorSize) {
          await Order.deleteOne({ _id: deleteid });
        }

        // let final_quantity;
        // colorSize.variationData.map((data) => {
        //   const get_product = data.sizes.filter(
        //     (data) => data.sizeName === SizeName
        //   );
        //   final_quantity = get_product[0].quantity + qit * 1;
        // });

        let final_quantity;
        colorSize.variationData.map((data) => {
          if (data.colorName == colorName) {
            const get_product = data.sizes.filter(
              (data) => data.sizeName === SizeName
            );
            final_quantity = get_product[0].quantity + qit * 1;
          }
        });

        Product.updateOne(
          { _id: id, "variationData.sizes.sizeName": SizeName },
          {
            $set: {
              "variationData.$[outerElem].sizes.$[nestedElem].quantity":
                final_quantity,
            },
          },
          {
            arrayFilters: [
              { "outerElem.colorName": colorName },
              { "nestedElem.sizeName": SizeName },
            ],
          },
          (err, result) => {
            if (err) throw err;
          }
        );
      }

      if (product.VariationType === "color") {
        const query = { _id: id, "variationData.colorName": colorName };

        const ColorProduct = await Product.findOne({ _id: id });

        const get_product = ColorProduct.variationData?.filter(
          (data) => data.colorName === colorName
        );

        const update_qnty = parseInt(get_product[0].quantity) + qit;

        const updateDocument = {
          $set: { "variationData.$.quantity": update_qnty },
        };

        let err, product;
        [err, product] = await to(Product.updateOne(query, updateDocument));
      }

      if (product.VariationType === "no") {
        const NoProduct = await Product.findOne({ _id: id });
        const update_qnty = parseInt(NoProduct.quantity) + qit;
        const updateDocument = {
          $set: { quantity: update_qnty },
        };

        let err, product;
        [err, product] = await to(
          Product.updateOne({ _id: id }, updateDocument)
        );
      }
    });
    let errror, order;
    [errror, order] = await to(Order.deleteOne({ _id: deleteid }));

    process.send({ message: "Delete sucsessful" });
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 1000);
  }
});
