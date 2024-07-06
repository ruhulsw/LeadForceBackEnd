const axios = require("axios");
const crypto = require("crypto");
const Domain = require("../../models/domain");
const redis = require("redis");
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
  await connection.close();
}

let redisClient;
(async () => {
  redisClient = redis.createClient();
  redisClient.on("error", (error) => console.error(`Error : ${error}`));
  await redisClient.connect();
})();

process.on("message", async (data) => {
  const {
    eventType,
    ip,
    userAgent,
    fbp,
    fbc,
    source_url,
    website,
    amount,
    customerName,
    mobileNumber,
    ecomId,
    content_ids,
  } = data;

  const effectiveWebsite =
    process.env.TESTING === "yes" ? "rusubd.com" : website;
  const cacheKey = `Store-${effectiveWebsite}`;
  let storeData = await redisClient.get(cacheKey);

  if (!storeData) {
    const domainData = await Domain.findOne({ domain: effectiveWebsite });
    if (domainData) {
      storeData = domainData;
      await redisClient.set(cacheKey, JSON.stringify(domainData));
    }
  } else {
    storeData = JSON.parse(storeData);
  }

  const hashedName = hashValue(customerName || "Null");
  const hashedMobile = hashValue(mobileNumber || "Null");
  const API_VERSION = "v17.0";

  const eventTemplate = {
    event_time: Math.floor(Date.now() / 1000),
    user_data: {
      client_ip_address: ip,
      client_user_agent: userAgent,
      fbp,
      fbc,
      ph: [hashedMobile],
    },
    event_id: ecomId,
    event_source_url: source_url,
    action_source: "website",
  };

  const eventMapping = {
    PageViewEvent: {
      event_name: "PageView",
      ...eventTemplate,
    },
    AddToCartEvent: {
      event_name: "AddToCart",
      ...eventTemplate,
      content_ids,
      currency: "BDT",
      value: amount,
    },
    CheckOutEvent: {
      event_name: "InitiateCheckout",
      ...eventTemplate,
      content_ids,
      currency: "BDT",
      value: amount,
    },
    PurchaseEvent: {
      event_name: "Purchase",
      ...eventTemplate,
      content_ids,
      currency: "BDT",
      value: amount,
      user_data: {
        ...eventTemplate.user_data,
        fn: hashedName,
      },
    },
  };

  if (storeData.pixel && storeData.FAccessToken) {
    const url = `https://graph.facebook.com/${API_VERSION}/${storeData.pixel}/events?access_token=${storeData.FAccessToken}&fbp=${fbp}&fbc=${fbc}`;
    const eventData = eventMapping[eventType];

    try {
      const response = await axios.post(url, { data: [eventData] });
      console.log("Conversions API");
      process.send(response.data);
    } catch (err) {
      console.error(err.response.data);
    }
  } else {
    process.send("No Pixel and FAccessToken");
  }

  setTimeout(async () => {
    await mongooseClose();
    process.exit(1);
  }, 2000);
});

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
