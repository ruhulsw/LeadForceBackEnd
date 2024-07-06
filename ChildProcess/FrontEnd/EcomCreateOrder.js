const Product = require("../../models/addProduct");
const Domain = require("../../models/domain");
const Order = require("../../models/order");
const Customer = require("../../models/customer");
const Team = require("../../models/team");
const Message = require("../../models/message");
const fs = require("fs");
const { fork } = require("child_process");
const path = require("path");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const axios = require("axios");
const redis = require("redis");
const FacebookConversionAPI =
  require("../../controllars/FacebookPurchaseAPI").FacebookConversionAPI;

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

process.on("message", async (data) => {
  try {
    const { url, ip, userAgent, body } = data;
    const effectiveUrl = process.env.TESTING === "yes" ? "rusubd.com" : url;
    const domain = await Domain.findOne({ domain: effectiveUrl });

    if (!domain) {
      process.send({ message: "No domain found.." });
      setTimeout(() => {
        mongooseClose();
        process.exit(1);
      }, 1000);
      return;
    }

    const {
      cName,
      cMobile,
      address,
      advance,
      discount,
      totalPrice,
      item,
      orderData,
      deliveryCharge,
      product,
      privateNote,
      Overseas,
    } = body;

    if (!totalPrice || !item) {
      process.send("error");
      mongooseClose();
      setTimeout(() => {
        process.exit(1);
      }, 100);
      return;
    }

    const invoiceId = generateInvoiceId(10);
    const profitData = await ProfitCal(orderData);
    const City = await getCity(ip);
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);

    const team = await Team.findOne({
      userStatus: 0,
      Admin_Id: domain.uid,
    }).sort({ assigned: 1 });

    if (team) {
      team.assigned += 1;
      await team.save();
    }

    const order = await Order.create({
      cName,
      cMobile,
      address,
      deliveryCharge,
      userId: domain.uid,
      advance,
      discount: discount || "",
      totalPrice,
      item,
      orderData,
      domain: domain.domain,
      date,
      profit: profitData,
      product,
      assignedTo: team ? team._id : "null",
      assignedName: team ? team.name : "null",
      Overseas,
      InvoiceId: invoiceId,
      OrderNote: privateNote,
      City,
    });

    await clearRedisCache(domain.uid);
    await handleFraudCheck(order);
    await sendOrderConfirmationSMS(cMobile, cName, domain);
    await handleCustomerData(cName, cMobile, address, deliveryCharge, domain);
    await OrderDistribution(domain.uid);

    if (order) {
      await updateProductQuantities(orderData);
      process.send({ message: "Order successful" });
      setTimeout(() => {
        mongooseClose();
        process.exit(1);
      }, 2000);
    }
  } catch (error) {
    console.error(error);
  }
});

// Helper functions

async function clearRedisCache(userId) {
  const keys = [
    `OrderToday-${userId}`,
    `OrderYesterday-${userId}`,
    `OrderMonth-${userId}`,
    `OrderLMonth-${userId}`,
    `OrderCity-${userId}`,
  ];
  for (const key of keys) {
    await redisClient.del(key);
  }
}

async function handleFraudCheck(order) {
  const FraudPathao = fork("./ChildProcess/FrontEnd/fraudCheck1.js");
  FraudPathao.send({ respon: order });
}

async function sendOrderConfirmationSMS(cMobile, cName, domain) {
  const filePath = path.join(__dirname, "../../Message/OrderConfirm.txt");
  fs.readFile(filePath, { encoding: "utf-8" }, async (err, data) => {
    if (!err) {
      let textdata = data.toString();
      textdata = textdata.replace("{name}", cName);
      textdata = textdata.replace("{store}", domain.store);
      textdata = textdata.replace("{domain}", domain.domain);
      textdata = textdata.replace("{number}", domain.number);
      textdata = textdata.replace("{WhatsApp}", domain.WhatsApp);
      textdata = textdata.replace("{bkash}", domain.bkash);
      await sendSMS(cMobile, textdata);
      await Message.create({
        messageFor: "Order Confirmation",
        userId: domain.uid,
      });
    } else {
      console.log(err);
    }
  });
}

async function handleCustomerData(
  cName,
  cMobile,
  address,
  deliveryCharge,
  domain
) {
  const isCustomer = await Customer.findOne({
    storeId: domain.uid,
    mobile: cMobile,
  });

  if (!isCustomer) {
    await Customer.create({
      name: cName,
      mobile: cMobile,
      address,
      isDhaka: deliveryCharge === "dhaka",
      domain: domain.domain,
      storeId: domain.uid,
    });
  }
}

async function updateProductQuantities(orderData) {
  for (const order of orderData) {
    const { id, quantity, VariationType, colorName, Size } = order;

    if (VariationType === "no") {
      const product = await Product.findOne({ _id: id });
      product.quantity -= quantity;
      await product.save();
    } else if (VariationType === "color") {
      const product = await Product.findOne({
        _id: id,
        "variationData.colorName": colorName,
      });
      const variation = product.variationData.find(
        (data) => data.colorName === colorName
      );
      variation.quantity -= quantity;
      await product.save();
    } else if (VariationType === "colorSize") {
      const product = await Product.findOne({
        _id: id,
        "variationData.colorName": colorName,
      });
      const variation = product.variationData.find(
        (data) => data.colorName === colorName
      );
      const size = variation.sizes.find((data) => data.sizeName === Size);
      size.quantity -= quantity;
      await product.save();
    }
  }
}

async function ProfitCal(orderData) {
  let Profit = 0;
  for (const order of orderData) {
    const { id, quantity, VariationType, colorName, Size } = order;
    let product;

    if (VariationType === "colorSize") {
      product = await Product.findOne({ _id: id });
      const variation = product.variationData.find(
        (data) => data.colorName === colorName
      );
      const size = variation.sizes.find((data) => data.sizeName === Size);
      Profit += (size.price - product.priceBuy) * quantity;
    } else if (VariationType === "color") {
      product = await Product.findOne({ _id: id });
      const variation = product.variationData.find(
        (data) => data.colorName === colorName
      );
      Profit += (variation.price - variation.buy_price) * quantity;
    } else {
      product = await Product.findOne({ _id: id });
      Profit += (product.proceSell - product.priceBuy) * quantity;
    }
  }
  return Profit;
}

async function sendSMS(cMobile, textdata) {
  const url = `https://bulksmsbd.net/api/smsapi?api_key=${process.env.SMS_SECRET}&type=text&number=${cMobile}&senderid=8809617611061&message=${textdata}`;
  console.log("sendSMS", url);
  try {
    const res = await axios.get(url);
    console.log(res.data);
  } catch (err) {
    console.error(err);
  }
}

async function OrderDistribution(cMobile, textdata) {
  // Implement OrderDistribution logic here
}

function generateInvoiceId(length) {
  let invoiceId = "";
  const characters = "0123456789";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    invoiceId += characters.charAt(randomIndex);
  }

  return invoiceId;
}

const getCity = async (clientIp) => {
  try {
    const response = await axios.get(`http://ip-api.com/json/${clientIp}`);
    return response.data.city;
  } catch (error) {
    console.error(error);
    return false;
  }
};
