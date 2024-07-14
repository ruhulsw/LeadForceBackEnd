const mongoose = require("mongoose");
const Data = require("../../models/data");

mongoose.set("strictQuery", false);

//============MongoDB=================
const URI = process.env.DB_URL;
mongoose.connect(URI);
//============MongoDB=================END

async function mongooseClose() {
  await mongoose.connection.close();
}

process.on("message", async ({ userId, page = 1, limit = 20, filters }) => {
  try {
    const offset = (page - 1) * limit;
    const objectId = new mongoose.Types.ObjectId(userId);

    const query = { userId: objectId };

    if (filters.employees && filters.employees.length > 0) {
      query["DataObject.# Employees"] = {
        $in: filters.employees.map((emp) => new RegExp(`^${emp}$`, "i")),
      };
    }
    if (filters.countries && filters.countries.length > 0) {
      query["DataObject.Country"] = {
        $in: filters.countries.map(
          (country) => new RegExp(`^${country}$`, "i")
        ),
      };
    }
    if (filters.industries && filters.industries.length > 0) {
      query["DataObject.Industry"] = {
        $in: filters.industries.map(
          (industry) => new RegExp(`^${industry}$`, "i")
        ),
      };
    }
    if (filters.jobTitles && filters.jobTitles.length > 0) {
      query["DataObject.Title"] = {
        $in: filters.jobTitles.map((title) => new RegExp(`^${title}$`, "i")),
      };
    }

    const data = await Data.find(query).skip(offset).limit(limit);

    const totalItems = await Data.countDocuments(query);

    process.send({
      data,
      totalItems,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    process.send({
      message: "An error occurred while fetching data",
      error: error.toString(),
    });
  }
  await mongooseClose();
  process.exit(0);
});
