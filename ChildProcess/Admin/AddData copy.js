const mongoose = require("mongoose");
const Data = require("../../models/data");

mongoose.set("strictQuery", false);

//============MongoDB=================
const { connection } = mongoose;
const URI = process.env.DB_URL;
mongoose.connect(URI);
//============MongoDB=================END

async function mongooseClose() {
  await connection.close();
}

process.on("message", async ({ userId, data }) => {
  try {
    const existingData = await Data.find({ userId: userId });

    console.log("existingData", existingData);

    const existingEmails = new Set();
    existingData.forEach((entry) => {
      existingEmails.add(entry.DataObject.Email);
    });

    console.log("existingEmails", existingEmails);

    const newData = data.filter(
      (newItem) => !existingEmails.has(newItem.Email)
    );

    console.log("newData", newData);

    const totalUniqueData = newData.length;

    if (totalUniqueData === 0) {
      process.send({
        message: "No new unique data to upload",
      });
      await mongooseClose();
      process.exit(0);
      return;
    }

    const bulkOps = newData.map((newItem) => ({
      insertOne: {
        document: {
          userId: userId,
          DataObject: newItem,
        },
      },
    }));

    await Data.bulkWrite(bulkOps);

    process.send({
      message: "Data uploaded successfully and merged with existing data",
    });
  } catch (error) {
    console.error(error);

    process.send({
      message: "An error occurred while uploading data",
      error: error.toString(),
    });
  }

  await mongooseClose();
  process.exit(0);
});
