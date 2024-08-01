const { fork } = require("child_process");
const User = require("../models/user");

exports.Login = async (req, res) => {
  const { email, password } = req.body;
  const Login = fork("./ChildProcess/Admin/Login.js");
  Login.send({ email, password });
  Login.on("message", (Login) => {
    return res.send(Login);
  });
};

exports.LoginTeam = async (req, res) => {
  const { mobile, password } = req.body;
  const LoginTeam = fork("./ChildProcess/Admin/LoginTeam.js");
  LoginTeam.send({ mobile, password });
  LoginTeam.on("message", (LoginTeam) => {
    return res.send(LoginTeam);
  });
};

exports.Signup = function (req, res) {
  const { username, email, password } = req.body;
  const Signup = fork("./ChildProcess/Admin/Signup.js");
  Signup.send({ username, email, password });
  Signup.on("message", (Signup) => {
    return res.send(Signup);
  });
};

exports.AddData = async (req, res) => {
  const userId = req.params.userId;
  const { data } = req.body;

  const numChunks = 30;
  const chunkSize = Math.ceil(data.length / numChunks);

  const dataChunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    dataChunks.push(data.slice(i, i + chunkSize));
  }

  if (dataChunks.length === 0) {
    dataChunks.push(data);
  }

  let responses = [];
  let processedChunks = 0;

  dataChunks.forEach((chunk, index) => {
    const AddData = fork("./ChildProcess/Admin/AddData.js");
    AddData.send({ userId, data: chunk });

    AddData.on("message", (response) => {
      responses.push(response);
      processedChunks++;

      if (processedChunks === dataChunks.length) {
        return res.send({
          message: "Data uploaded successfully and merged with existing data",
          details: responses,
        });
      }
    });
  });
};

exports.GetData = (req, res) => {
  const userId = req.params.userId;
  const { page, limit, filters } = req.body; // Get filters from request body
  const getDataProcess = fork("./ChildProcess/Admin/GetData.js");
  getDataProcess.send({ userId, page, limit, filters }); // Send filters to child process

  getDataProcess.on("message", (data) => {
    res.send(data);
  });

  getDataProcess.on("error", (error) => {
    res.status(500).send({
      message: "An error occurred while fetching data",
      error: error.toString(),
    });
  });

  getDataProcess.on("exit", (code) => {
    if (code !== 0) {
      res.status(500).send({
        message: `Child process exited with code ${code}`,
      });
    }
  });
};

exports.GetAllData = (req, res) => {
  const userId = req.params.userId;
  const { filters } = req.body;
  const generateCsvProcess = fork("./ChildProcess/Admin/GetAllData.js");

  generateCsvProcess.send({ userId, filters });

  generateCsvProcess.on("message", async (data) => {
    if (data.fileLink) {
      res.json({ fileLink: data.fileLink });
    } else {
      res.status(500).json({ message: data.message });
    }
  });

  generateCsvProcess.on("error", (error) => {
    res.status(500).json({
      message: "An error occurred while generating CSV",
      error: error.toString(),
    });
  });

  generateCsvProcess.on("exit", (code) => {
    if (code !== 0) {
      res
        .status(500)
        .json({ message: `Child process exited with code ${code}` });
    }
  });
};

exports.ChangePassword = async (req, res) => {
  const uid = req.params.id;
  const { oldPass, newPass } = req.body;
  const ChangePassword = fork("./ChildProcess/Admin/ChangePassword.js");
  ChangePassword.send({ uid, oldPass, newPass });
  ChangePassword.on("message", (ChangePassword) => {
    return res.send(ChangePassword);
  });
};

exports.ExpirePassword = async (req, res) => {
  const uid = req.params.id;
  const token = req.header("token");
  const ExpirePassword = fork("./ChildProcess/Admin/ExpirePassword.js");
  ExpirePassword.send({ uid, token });
  ExpirePassword.on("message", (ExpirePassword) => {
    return res.send(ExpirePassword);
  });
};

exports.SetPassword = async (req, res) => {
  const uid = req.params.id;
  const { newPass } = req.body;
  const ChangePassword = fork("./ChildProcess/Admin/Load.js");
  ChangePassword.send({ uid, newPass });
  ChangePassword.on("message", (ChangePassword) => {
    return res.send(ChangePassword);
  });
};

exports.GetProfile = async (req, res) => {
  const { id } = req.params;

  const user = await User.findById({ _id: id });
  if (user) {
    return res.send({
      name: user.username,
      mobile: user.mobile,
      address: user.address,
    });
  }
  return res.send("No user found..");
};

exports.UpdateProfile = async (req, res) => {
  const { id } = req.params;
  const { name, Mobile, Address } = req.body;

  const user = await User.findById({ _id: id });
  if (user) {
    user.username = name ? name : user.username;
    user.mobile = Mobile ? Mobile : user.mobile;
    user.address = Address ? Address : user.address;
    await user.save();
    return res.send("Profile has been updated..");
  }
  return res.send("No user found..");
};
