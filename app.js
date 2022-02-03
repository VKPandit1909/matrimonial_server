const express = require("express");
var cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const PORT = process.env.PORT || 3000;
const bcrypt = require("bcryptjs");

app.use(cors());

const jwt = require("jsonwebtoken");
const JWT_SECRET =
  "Your JWT secret here";

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));

require("./Matrimonial");
const User = mongoose.model("MatrimonialUsers");

const mongoUri = "Your MongoDB url here";
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

// Connecting to database
mongoose.connection.on("connected", () => {
  console.log("Connected to database");
});

// Connection Error
mongoose.connection.on("error", (err) => {
  console.log("Error is : " + err);
});

// Authentication
// Login
app.post("/login", async (req, res) => {
  const { mobile, password } = req.body;
  const user = await User.findOne({ mobile }).lean();

  if (!user) {
    return res.json({ status: "error", error: "Invalid mobile/password" });
  }

  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign(
      {
        id: user._id,
        mobile: user.mobile,
      },
      JWT_SECRET
    );
    if (parseInt(user.status)) {
      return res.json({ status: "ok", data: token });
    } else {
      return res.json({
        status: "warning",
        data: { userStatus: user.status, userType: user.type },
      });
    }
  }
  res.json({ status: "error", error: "Invalid mobile/password" });
});
// Change Password
app.post("/change-password", async (req, res) => {
  const { token, password: plainTextPassword, prevpass } = req.body;
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const _id = user.id;
    const userData = await User.findOne({ _id }).lean();
    // if (await bcrypt.compare(prevpass, userData.password)) {
      const password = await bcrypt.hash(plainTextPassword, 10);
      await User.updateOne(
        {
          _id: _id,
        },
        {
          $set: {
            password: password,
          },
        }
      );
      res.json({ status: "ok", data: "Password Updated" });

  } catch (error) {
    res.json({ status: "error", error: error });
  }
  res.json({ status: "ok", data: user });
});
// Forgot Password
app.post("/forgot-password", async (req, res) => {
  const { mobile, plainTextPassword } = req.body;
  try {
    const userData = await User.findOne({ mobile }).lean();
    if (!userData) {
      return res.json({ status: "error", error: "Invalid mobile" });
    }
    const password = await bcrypt.hash(plainTextPassword, 10);
    await User.updateOne(
      {
        _id: userData._id,
      },
      {
        $set: {
          password: password,
        },
      }
    );
    res.json({ status: "ok", data: "Password Updated" });
  } catch (error) {
    res.json({ status: "error", error: error });
  }
  res.json({ status: "ok", data: "Invalid mobile" });
});
// Register
app.post("/register", async (req, res) => {
  console.log(req.body, "ad");
  const regDate = new Date().toLocaleString();
  const jathagamId = Math.floor(Math.random() * Date.now());
  const {
    name,
    gender,
    caste,
    email,
    mobile,
    registeredBy,
    password: plainTextPassword,
  } = req.body;
  const password = await bcrypt.hash(plainTextPassword, 10);
  try {
    var regNumber = 1;
    await User.find({})
      .sort({ _id: -1 })
      .limit(1)
      .then((data) => {
        console.log(data[0]["regDate"]);
        if (data[0]["regNumber"]) {
          regNumber = parseInt(data[0]["regNumber"]) + 1;
        } else {
          regNumber = 1;
        }
      })
      .catch((err) => {
        console.log(err);
      });
    const response = await User.create({
      name,
      gender,
      caste,
      email,
      mobile,
      password,
      regDate,
      jathagamId,
      regNumber,
      registeredBy,
    });
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      // uses exists
      return res.json({ status: "error", error: "User exists" });
    }
    throw error;
  }
  res.json({ status: "ok" });
});

// Basic Details
app.post("/set-details", (req, res) => {
  const { token, fields } = req.body;
  try {
    console.log(fields);
    const user = jwt.verify(token, JWT_SECRET);
    const userid = user.id;
    User.updateOne(
      {
        _id: userid,
      },
      {
        $set: fields,
      },
      { overwrite: false, new: true },
      function (err, res) {
        console.log(err, res);
      }
    );
    return res.json({ status: "ok", data: "Updated" });
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: error });
  }
});

// User Details
app.post("/user-details", (req, res) => {
  const token = req.body.token;
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const userid = user.id;
    console.log(userid);
    User.findOne({ _id: userid })
      .then((data) => {
        return res.json({ status: "ok", data: data });
      })
      .catch((err) => {
        return res.json({ status: "error", error: err });
      });
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: error });
  }
});

// Getting data
app.post("/user-datas", (req, res) => {
  const { token, gender } = req.body;
  if (gender == undefined) {
    const { token } = req.body;
    User.find({})
      .then((data) => {
        res.json({ status: "ok", data: data });
      })
      .catch((err) => {
        res.json({ status: "ok", error: err });
      });
  } else {
    User.find({ gender: gender })
      .then((data) => {
        res.json({ status: "ok", data: data });
      })
      .catch((err) => {
        res.json({ status: "ok", error: err });
      });
  }
});
//withput Login users
// Getting data
app.post("/user-data-all", (req, res) => {
  User.find({})
    .then((data) => {
      res.json({ status: "ok", data: data });
    })
    .catch((err) => {
      res.json({ status: "ok", error: err });
    });
});
// Shortlisted Users
app.post("/shortlist-user", (req, res) => {
  const { token, suid } = req.body;
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const userid = user.id;
    console.log(userid);
    User.findOne({ _id: userid }, { shortlistUsers: 1 })
      .then((data) => {
        var sUsers = "";
        if (data.shortlistUsers == undefined || data.shortlistUsers == "") {
          sUsers = suid;
        } else {
          sUsers = data.shortlistUsers + "," + suid;
        }
        User.updateOne(
          {
            _id: userid,
          },
          {
            $set: {
              shortlistUsers: sUsers,
            },
          },
          { overwrite: false, new: true },
          function (err, res) {
            console.log(err, res);
          }
        );
        return res.json({ status: "ok", data: sUsers });
      })
      .catch((err) => {
        return res.json({ status: "error", error: err });
      });
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: error });
  }
});

//Update ShortList User
app.post("/update-shortlist", (req, res) => {
  const { token, sUsers } = req.body;
  const user = jwt.verify(token, JWT_SECRET);
  const userid = user.id;
  console.log(userid);
  try {
    User.updateOne(
      {
        _id: userid,
      },
      {
        $set: {
          shortlistUsers: sUsers,
        },
      },
      { overwrite: false, new: true },
      function (err, res) {
        console.log(err, res);
      }
    );
    res.json({ status: "ok", data: "Shortlist Updated." });
  } catch (err) {
    res.json({ status: "error", error: err });
  }
});

// Interested Users
app.post("/interest-user", (req, res) => {
  const { token, iuid } = req.body;
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const userid = user.id;
    console.log(userid);
    User.findOne({ _id: userid }, { interestInUsers: 1 })
      .then((data) => {
        var sUsersIn = "";
        if (data.interestInUsers == undefined || data.interestInUsers == "") {
          sUsersIn = iuid;
        } else {
          sUsersIn = data.interestInUsers + "," + iuid;
        }
        User.updateOne(
          {
            _id: userid,
          },
          {
            $set: {
              interestInUsers: sUsersIn,
            },
          },
          { overwrite: false, new: true },
          function (err, res) {
            console.log(err, res);
          }
        );
        User.findOne({ _id: iuid }, { interestByUsers: 1 })
          .then((data) => {
            var sUsers = "";
            if (
              data.interestByUsers == undefined ||
              data.interestByUsers == ""
            ) {
              sUsers = userid;
            } else {
              sUsers = data.interestByUsers + "," + userid;
            }
            User.updateOne(
              {
                _id: iuid,
              },
              {
                $set: {
                  interestByUsers: sUsers,
                },
              },
              { overwrite: false, new: true },
              function (err, res) {
                console.log(err, res);
              }
            );
            return res.json({ status: "ok", data: sUsersIn });
          })
          .catch((err) => {
            return res.json({ status: "error", error: err });
          });
      })
      .catch((err) => {
        return res.json({ status: "error", error: err });
      });
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: error });
  }
});

// Admin Panel Section
require("./AdminDetails");
const AdminUser = mongoose.model("AdminDetails");

// Set Address on jagatham PDF
app.post("/set-address", (req, res) => {
  const { fields, token } = req.body;
  try {
    console.log(fields);
    const user = jwt.verify(token, JWT_SECRET);
    const userid = user.id;

    AdminUser.updateOne(
      {
        _id: userid,
      },
      {
        $set: fields,
      },
      { overwrite: false, new: true },
      function (err, res) {
        console.log(err, res);
      }
    );
    return res.json({ status: "ok", data: "Updated Admin" });
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: error });
  }
});

// Getting the admin details
app.post("/admin-details", (req, res) => {
  try {
    User.findOne({ _id: "6120d7942009d11c4c64eb79" })
      .then((data) => {
        return res.json({ status: "ok", data: data });
      })
      .catch((err) => {
        return res.json({ status: "error", error: err });
      });
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: error });
  }
});

// Getting the single admin detail
app.post("/single-admin-detail", (req, res) => {
  const userid = req.body.userid;
  AdminUser.find({ _id: "6120d7942009d11c4c64eb79" })
    .then((data) => {
      res.json({ status: "ok", data: data });
    })
    .catch((err) => {
      res.json({ status: "ok", error: err });
    });
});

// Admin Login
app.post("/admin-login", async (req, res) => {
  const { username, password } = req.body;
  const adminuser = await AdminUser.findOne({ username }).lean();

  if (!adminuser) {
    return res.json({ status: "error", error: "Invalid username/password" });
  }

  if (await bcrypt.compare(password, adminuser.password)) {
    const token = jwt.sign(
      {
        id: adminuser._id,
        username: adminuser.username,
      },
      JWT_SECRET
    );
    return res.json({ status: "ok", data: token });
  }
  res.json({ status: "error", error: "Invalid username/password" });
});

// Change Admin Password
app.post("/change-admin-password", async (req, res) => {
  const { token, password: plainTextPassword } = req.body;
  try {
    const adminuser = jwt.verify(token, JWT_SECRET);
    const _id = adminuser.id;
    const password = await bcrypt.hash(plainTextPassword, 10);
    await AdminUser.updateOne(
      {
        _id: _id,
      },
      {
        $set: {
          password: password,
        },
      }
    );
    res.json({ status: "ok", data: "Password Updated" });
  } catch (error) {
    res.json({ status: "error", error: error });
  }
});

// Admin Creation
app.post("/create-admins", async (req, res) => {
  console.log(req.body);
  const { name, username, type, password: plainTextPassword } = req.body;
  const password = await bcrypt.hash(plainTextPassword, 10);
  try {
    const response = await AdminUser.create({
      name,
      username,
      type,
      password,
    });
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      // uses exists
      return res.json({ status: "error", error: "User exists" });
    }
    throw error;
  }
  res.json({ status: "ok" });
});

// Getting Users in Admin Panel
app.post("/users-list", (req, res) => {
  const type = req.body.fields;
  User.find(type, {
    name: 1,
    "basic.age": 1,
    gender: 1,
    type: 1,
    status: 1,
    caste: 1,
    email: 1,
    mobile: 1,
  })
    .then((data) => {
      res.json({ status: "ok", data: data });
    })
    .catch((err) => {
      res.json({ status: "ok", error: err });
    });
});
// Getting User Details in Admin Panel
app.post("/interest-users-details", (req, res) => {
  const userids = req.body.userids;
  User.find({ _id: { $in: userids } }, { name: 1, "basic.age": 1, photo: 1 })
    .then((data) => {
      res.json({ status: "ok", data: data });
    })
    .catch((err) => {
      res.json({ status: "ok", error: err });
    });
});

// Getting Single User Details in Admin Panel
app.post("/single-users-details", (req, res) => {
  let findObj;
  if ("jathagamId" in req.body) {
    const jathagamId = req.body.jathagamId;
    findObj = { jathagamId: jathagamId };
  } else {
    const userid = req.body.userid;
    findObj = { _id: userid };
  }

  User.find(findObj)
    .then((data) => {
      res.json({ status: "ok", data: data });
    })
    .catch((err) => {
      res.json({ status: "ok", error: err });
    });
});

// Updating Users status in Admin Panel
app.post("/update-user-status", (req, res) => {
  const { userid, status } = req.body;
  User.updateOne(
    {
      _id: userid,
    },
    {
      $set: {
        status: status,
      },
    },
    { overwrite: false, new: true },
    function (err, res) {
      console.log(err, res);
    }
  );
  return res.json({ status: "ok", data: "Updated" });
});

// Updating Users Type in Admin Panel
app.post("/update-user-type", (req, res) => {
  const { userid, type } = req.body;
  User.updateOne(
    {
      _id: userid,
    },
    {
      $set: {
        type: type,
      },
    },
    { overwrite: false, new: true },
    function (err, res) {
      console.log(err, res);
    }
  );
  return res.json({ status: "ok", data: "Updated" });
});

// Data Manipulation
app.post("/manipulate", (req, res) => {
  const { name, drinking } = req.body;
  const fields = req.body;

  User.find(fields)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.send(err);
    });

  User.updateOne(
    {
      _id: "61190484abdd9c21408c4781",
    },
    {
      $set: {
        lookingfor: "Hello",
        locationprefer: {
          country: "India",
          state: "Maharashtra",
          city: "Virar",
        },
      },
    },
    { overwrite: false, new: true },
    function (err, res) {
      console.log(err, res);
    }
  );
});

// Connecting to Node JS
app.get("/", (req, res) => {
  // User.find({}).sort({_id:-1}).limit(1)
  // .then((data) => {
  //   console.log(data[0]['regDate']);
  //   res.send(data);
  //   if(data[0]['regNumber']) {
  //     const regNumber = parseInt(data[0]['regNumber']) + 1;
  //   } else {
  //     const regNumber = 1;
  //   }
  // })
  // .catch((err) => {
  //   console.log(err);
  // });
  res.send("Welcome to Node JS.");
});

app.listen(PORT, () => {
  console.log("Server Started on PORT " + PORT);
});
