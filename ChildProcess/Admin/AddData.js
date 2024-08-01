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
    const bulkOps = data.map((newItem) => ({
      insertOne: {
        document: {
          userId: userId,
          DataObject: newItem,
        },
      },
    }));

    await Data.bulkWrite(bulkOps);

    process.send({
      message: "Data uploaded successfully",
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
