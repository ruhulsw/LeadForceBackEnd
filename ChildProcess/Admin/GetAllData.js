const mongoose = require("mongoose");
const CsvFile = require("../../models/CsvFile");
const Data = require("../../models/data");
const { Parser } = require("json2csv");
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

process.on("message", async ({ userId, filters }) => {
  try {
    const objectId = new mongoose.Types.ObjectId(userId);

    const query = { userId: objectId };

    if (filters.employees && filters.employees.length > 0) {
      query["DataObject.# Employees"] = { $in: filters.employees };
    }
    if (filters.countries && filters.countries.length > 0) {
      query["DataObject.Country"] = { $in: filters.countries };
    }
    if (filters.industries && filters.industries.length > 0) {
      query["DataObject.Industry"] = { $in: filters.industries };
    }
    if (filters.jobTitles && filters.jobTitles.length > 0) {
      query["DataObject.Title"] = { $in: filters.jobTitles };
    }

    console.log("Constructed query:", query);

    const data = await Data.find(query);

    console.log("Found data:", data);

    if (data.length === 0) {
      process.send({
        message: "No data found for the provided filters",
      });
      await mongooseClose();
      process.exit(0);
    }

    // Flatten DataObject fields
    const flattenedData = data.map((item) => {
      return {
        ...item._doc.DataObject,
      };
    });

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(flattenedData);

    const fileName = `Lead_${Date.now()}.csv`;
    const filePath = path.join(__dirname, "../../csv_files", fileName);

    fs.writeFileSync(filePath, csv);

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
