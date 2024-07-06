const Color = require("../../../models/Color");
const { AllCacheClean } = require("../../../controllars/CacheClean");
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

process.on("message", async ({ id, body }) => {
  const {
    HeaderColor,
    HeaderTextColor,
    FooterColor,
    FooterTextColor,
    AddToCartColor,
    AddToCartTextColor,
    BuyNowColor,
    BuyNowTextColor,
  } = body;

  const getColors = await Color.findOne({ uid: id });
  if (getColors) {
    await Color.updateOne(
      { uid: id },
      {
        $set: {
          data: [
            {
              HeaderColor,
              HeaderTextColor,
              FooterColor,
              FooterTextColor,
              AddToCartColor,
              AddToCartTextColor,
              BuyNowColor,
              BuyNowTextColor,
            },
          ],
        },
      }
    );
    AllCacheClean(id);
    process.send("Update Successful");
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 200);
  } else {
    await Color.create({
      uid: id,
      data: [
        {
          HeaderColor,
          HeaderTextColor,
          FooterColor,
          FooterTextColor,
          AddToCartColor,
          AddToCartTextColor,
          BuyNowColor,
          BuyNowTextColor,
        },
      ],
    });
    AllCacheClean(id);
    process.send("Update Successful");
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 200);
  }
});
