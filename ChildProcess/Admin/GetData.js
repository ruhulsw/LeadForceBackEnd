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
      query["$or"] = filters.employees.map((range) => {
        const [min, max] = range.split("-").map(Number);
        if (!isNaN(min) && !isNaN(max)) {
          return {
            $expr: {
              $and: [
                {
                  $gte: [
                    {
                      $convert: {
                        input: {
                          $trim: {
                            input: "$DataObject.# Employees",
                            chars: "# ",
                          },
                        },
                        to: "int",
                        onError: 0,
                        onNull: 0,
                      },
                    },
                    min,
                  ],
                },
                {
                  $lte: [
                    {
                      $convert: {
                        input: {
                          $trim: {
                            input: "$DataObject.# Employees",
                            chars: "# ",
                          },
                        },
                        to: "int",
                        onError: 0,
                        onNull: 0,
                      },
                    },
                    max,
                  ],
                },
              ],
            },
          };
        } else {
          return { "DataObject.# Employees": new RegExp(`^${range}$`, "i") };
        }
      });
    }

    if (filters.countries && filters.countries.length > 0) {
      query["DataObject.Country"] = {
        $in: filters.countries.map(
          (country) => new RegExp(`^${country}$`, "i")
        ),
      };
    }

    if (filters.industries && filters.industries.length > 0) {
      const industryRegexes = filters.industries.flatMap((industries) =>
        industries
          .split(",")
          .map((industry) => new RegExp(industry.trim(), "i"))
      );
      query["DataObject.Industry"] = { $in: industryRegexes };
    }

    if (filters.jobTitles && filters.jobTitles.length > 0) {
      const jobTitleRegexes = filters.jobTitles.flatMap((titles) =>
        titles.split(",").map((title) => new RegExp(title.trim(), "i"))
      );
      query["DataObject.Title"] = { $in: jobTitleRegexes };
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
