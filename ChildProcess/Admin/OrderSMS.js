const { to } = require("await-to-js");
const User = require("../../models/user");
const Message = require("../../models/message");
const Domain = require("../../models/domain");
const Product = require("../../models/addProduct");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const fs = require("fs");
const path = require("path");
const axios = require("axios");
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

process.on("message", async ({ name, mobile, message, uid }) => {
  if (uid === "641f7a24c1ad6f94ef1b20be") {
    const messageData = `
    Hi, ${name} ${message} 
    `;
    const url = `https://bulksmsbd.net/api/smsapi?api_key=${process.env.SMS_SECRET}&type=text&number=${mobile}&senderid=8809617611061&message=${messageData}`;
    const result = await axios.get(url);

    process.send(result.data);

    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 3000);
  } else {
    process.send("Buy SMS BALANCE");
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 200);
  }
});

async function sendSMS(cMobile, textdata) {}
