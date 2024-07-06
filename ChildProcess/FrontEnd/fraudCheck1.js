const { to } = require("await-to-js");
const Order = require("../../models/order");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
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
  async function fraudCheck(number) {
    console.log("FraudData Pathao", number);
    process.env["LD_LIBRARY_PATH"] = "/usr/lib/x86_64-linux-gnu/libgbm.so.1";

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
      executablePath: "/usr/bin/chromium-browser",
    });

    try {
      const page = await browser.newPage();
      await page.goto("https://merchant.pathao.com");
      await page.type(".pt-input.pt-input-no-icon", "mrruhul247@gmail.com");
      await page.type("#passwordInput", "6DmO32G3M1ww");
      const button = await page.$(".pt-btn.pt-btn-danger");
      await button.click();
      await page.waitForNavigation();
      await page.goto("https://merchant.pathao.com/courier/orders/create");
      await page.type('input[name="recipient_phone"]', `${number}`);

      const finalResponse = await page.waitForResponse(
        (response) =>
          response.url() ===
            "https://merchant.pathao.com/api/v1/user/success" &&
          (response.request().method() === "PATCH" ||
            response.request().method() === "POST"),
        11
      );

      let responseJson = await finalResponse.json();
      const update = await Order.updateOne(
        { _id: data.respon._id },
        { $set: { FraudPathao: responseJson } }
      );
      if (update) {
        console.log("Pathao fraud data saved");
        await browser.close();
        mongooseClose();
        process.exit(1);
      }
      console.log(responseJson);
    } catch (error) {
      await browser.close();
      console.error("An error occurred:", error);
      mongooseClose();
      process.exit(1);
      
    }
  }

  fraudCheck(data.respon.cMobile);
});
