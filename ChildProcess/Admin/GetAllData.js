const mongoose = require("mongoose");
const CsvFile = require("../../models/CsvFile");
const Data = require("../../models/data");
const {
  Parser,
  transforms: { unwind },
} = require("json2csv");
const fs = require("fs");
const path = require("path");

mongoose.set("strictQuery", false);

//============MongoDB=================
const URI = process.env.DB_URL;
mongoose.connect(URI);
//============MongoDB=================END

async function mongooseClose() {
  await mongoose.connection.close();
}

const batchSize = 1000; // Define your batch size here

async function processBatch(query, skip, limit) {
  const data = await Data.find(query).skip(skip).limit(limit).lean();

  if (data.length === 0) return [];

  // Flatten DataObject fields
  const flattenedData = data.map((item) => ({
    ...item.DataObject,
  }));

  return flattenedData;
}

process.on("message", async ({ userId, filters }) => {
  try {
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

    const totalItems = await Data.countDocuments(query);

    if (totalItems === 0) {
      process.send({
        message: "No data found for the provided filters",
      });
      await mongooseClose();
      process.exit(0);
    }

    const fileName = `Lead_${Date.now()}.csv`;
    const filePath = path.join(__dirname, "../../csv_files", fileName);
    const writeStream = fs.createWriteStream(filePath);

    const json2csvParser = new Parser({ header: true });
    writeStream.write(json2csvParser.parse([])); // Write CSV header

    for (let skip = 0; skip < totalItems; skip += batchSize) {
      const batchData = await processBatch(query, skip, batchSize);
      if (batchData.length > 0) {
        const csv = json2csvParser.parse(batchData, { header: false });
        writeStream.write(csv);
      }
    }

    writeStream.end();

    const Link = `https://api.bigleadlist.xyz/csv/${fileName}`;

    const csvFile = new CsvFile({
      userId: objectId,
      fileName,
      filePath,
      Link,
    });

    await csvFile.save();

    process.send({
      message: "CSV file generated",
      fileLink: Link,
    });
  } catch (error) {
    console.error("Error generating CSV:", error);
    process.send({
      message: "An error occurred while generating CSV",
      error: error.toString(),
    });
  }
  await mongooseClose();
  process.exit(0);
});
