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
    console.log("FraudData SteadFast", number);
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
    const page = await browser.newPage();

    try {
      await page.goto("https://steadfast.com.bd/login");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.type(
        ".form-control.pl-3.arroba.mb-1.h-auto.bg-transparent",
        "mrruhul247@gmail.com"
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.type('.form-control[type="password"]', "GqL58SmNwqxj6fg");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.click('button[type="submit"]');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.click('a[href="https://steadfast.com.bd/fraud"]');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.click('a[href="https://steadfast.com.bd/user/fraud-check"]');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await page.type("#phonenumber", "01711026578");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Before response");
      await page.click(".btn.btn-block.bg-color-seagreen.text-white.shadow-1");
      // page.on("response", async (response) => {
      //   const contentType = response.headers()["content-type"];
      //   if (contentType && contentType.includes("application/json")) {
      //     const jsonResponse = await response.json();
      //     const update = await Order.updateOne(
      //       { _id: data.respon._id },
      //       { $set: { FraudSteadFast: jsonResponse } }
      //     );
      //     console.log(jsonResponse);
      //     if (update) {
      //       console.log("SteadFast fraud data saved");
      //       mongooseClose();
      //       process.exit(1);
      //     }
      //   }
      // });
      const divContent = await page.evaluate(() => {
        const divElement = document.querySelector(
          'div[style="display: none; position: absolute; top: 210px; left: 1013px; white-space: nowrap; font-family: Roboto; font-size: 13px; font-weight: bold;"]'
        );
        if (divElement) {
          return divElement.textContent;
        }
        return null;
      });
      console.log(divContent);
    } catch (error) {
      await browser.close();
      console.error("An error occurred:", error);
      mongooseClose();
      process.exit(1);
    }
    await browser.close();
  }

  fraudCheck(data.respon.cMobile);
});
