const { to } = require("await-to-js");
const Product = require("../../models/addProduct");
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

process.on("message", async (data) => {
  let res = false;
  data.body.map(async (data) => {
    const D_ColorName = data.colorName;
    const P_Id = data.id;

    if (data.VariationType === "no") {
      let err, product;
      [err, product] = await to(Product.findById({ _id: P_Id }));
      console.log(product);
      console.log("err", err);
      if (product.quantity < 1) {
        res = true;
      } else {
        res = false;
      }
    }
    if (data.VariationType === "color") {
      let err, product;
      [err, product] = await to(Product.findOne({ _id: data.id }));
      product.variationData.map((data) => {
        if (data.colorName === D_ColorName) {
          if (data.quantity < 1) {
            res = true;
          } else {
            res = false;
          }
        }
      });
    }
  });

  process.send(res);
  setTimeout(() => {
    mongooseClose();
    process.exit(1);
  }, 2000);
});
