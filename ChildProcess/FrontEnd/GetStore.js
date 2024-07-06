const Domain = require("../../models/domain");
const Color = require("../../models/Color");
const User = require("../../models/user");
const redis = require("redis");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

const { connection } = mongoose;
const URI = process.env.DB_URL;
const OPTS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

mongoose.connect(URI, OPTS);

let redisClient;
(async () => {
  redisClient = redis.createClient();
  redisClient.on("error", (error) => console.error(`Redis Error: ${error}`));
  await redisClient.connect();
})();

async function mongooseClose() {
  await connection.close();
}

async function fetchDomainData(url) {
  const furl = process.env.TESTING === "yes" ? "rusubd.com" : url;
  try {
    const domain = await Domain.findOne({ domain: furl });
    if (!domain) throw new Error("Domain not found");

    const color = await Color.findOne({ uid: domain.uid });
    if (!color) throw new Error("Color not found");

    domain.color = color.data[0];
    const user = await User.findOne({ _id: domain.uid });
    if (!user) throw new Error("User not found");

    const currentDateFromDB = new Date(user.nextBilling);
    const futureDate = new Date(currentDateFromDB);
    futureDate.setDate(currentDateFromDB.getDate() + 3);
    const currentDate = new Date();
    domain.suspended = currentDate > futureDate;

    return convertData(domain);
  } catch (error) {
    throw new Error(`Error fetching domain data: ${error.message}`);
  }
}

process.on("message", async ({ url }) => {
  try {
    const data = await fetchDomainData(url);
    process.send(data);
  } catch (error) {
    console.error(`Error processing domain request: ${error.message}`);
    process.send({ error: error.message });
  } finally {
    setTimeout(async () => {
      await mongooseClose();
      redisClient.quit();
      process.exit(1);
    }, 2000);
  }
});

function convertData(domainData) {
  return {
    domain: domainData.domain,
    logo: domainData.logo,
    store: domainData.store,
    pixel: domainData.pixel,
    WhatsApp: domainData.WhatsApp,
    number: domainData.number,
    Dhaka: domainData.Dhaka,
    Outside: domainData.Outside,
    MessangerUrl: domainData.MessangerUrl,
    Address: domainData.Address,
    Email: domainData.Email,
    FacebookUrl: domainData.FacebookUrl,
    InstagramUrl: domainData.InstagramUrl,
    YouTubeUrl: domainData.YouTubeUrl,
    GoogleAdsTag: domainData.GoogleAdsTag,
    GoogleAnalytic: domainData.GoogleAnalytic,
    color: domainData.color,
    suspended: domainData.suspended,
  };
}
