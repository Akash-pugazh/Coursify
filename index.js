const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const PORT = 3000;
app.use(express.json());
app.use(cors());

// let ADMINS = [];
// let USERS = [];
// let COURSES = [];

// & Schemas

const adminSchema = new mongoose.Schema({
  userName: String,
  password: String,
});

const userSchema = new mongoose.Schema({
  userName: String,
  password: String,
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageLink: String,
  published: Boolean,
});

// & Models

const Admin = mongoose.model("Admin", adminSchema);
const User = mongoose.model("User", userSchema);
const Course = mongoose.model("Course", courseSchema);

// & Connect to Db

mongoose.connect(
  "mongodb+srv://Aakash:aakash13@cluster-0.bkum328.mongodb.net/Coursify"
);

const generateJsonMessage = (status, message, ...rest) => {
  return {
    status,
    message,
    token: rest,
  };
};

const adminSecretToken = fs.readFileSync(
  __dirname + "/adminSecretKey.pem",
  "utf-8"
);

const userSecretToken = fs.readFileSync(
  __dirname + "/userSecretKey.pem",
  "utf-8"
);

const generateAdminJWT = user => {
  const payLoad = { userName: user.userName };
  const encodedJwtToken = jwt.sign(payLoad, adminSecretToken);
  return encodedJwtToken;
};

const generateUserJWT = user => {
  const payLoad = { userName: user.userName };
  const encodedJwtToken = jwt.sign(payLoad, userSecretToken);
  return encodedJwtToken;
};

const adminAuthentication = (req, res, next) => {
  const encodedJwtToken = req.headers.authorization;
  if (encodedJwtToken) {
    jwt.verify(encodedJwtToken, adminSecretToken, (err, decodedToken) => {
      if (err)
        res
          .status(400)
          .json(generateJsonMessage("Failure", "Unauthorized access"));

      req.user = decodedToken;
      next();
    });
  } else {
    res
      .status(400)
      .json(generateJsonMessage("Failure", "Authorization Token Invalid"));
  }
};

const userAuthentication = (req, res, next) => {
  const encodedJwtToken = req.headers.authorization;
  if (encodedJwtToken) {
    jwt.verify(encodedJwtToken, userSecretToken, (err, decodedToken) => {
      if (err)
        res
          .status(400)
          .json(generateJsonMessage("Failure", "Unauthorized access"));

      req.user = decodedToken;
      next();
    });
  } else {
    res
      .status(400)
      .json(generateJsonMessage("Failure", "Authorization token not found"));
  }
};

app.get("/", (req, res) => {
  res.status(200).send("Coursify Home Page");
});

app.post("/admin/signup", async (req, res) => {
  const { userName, password } = req.body;
  // const isAdminExist = ADMINS.find(admin => admin.userName === userName);
  const isAdminExist = await Admin.findOne({ userName });
  if (isAdminExist) {
    return res
      .status(400)
      .json(generateJsonMessage("Failure", "Admin already exist"));
  } else {
    const newAdminObj = {
      userName,
      password,
    };
    // ADMINS.push(newAdminObj);
    const newAdmin = new Admin(newAdminObj);
    await newAdmin.save();
    const token = generateAdminJWT(newAdminObj);
    res
      .status(200)
      .json(
        generateJsonMessage("Success", "Admin created successfully", token)
      );
  }
});

app.post("/admin/login", async (req, res) => {
  const { username: userName, password } = req.headers;
  // const isAdminExist = ADMINS.find(
  //   admin => admin.userName === username && admin.password === password
  // );
  const isAdminExist = await Admin.findOne({
    userName,
    password,
  });
  if (isAdminExist) {
    const token = generateAdminJWT(isAdminExist);
    res
      .status(200)
      .json(
        generateJsonMessage("Success", "Login authorized successfully", token)
      );
  } else {
    res.status(400).json(generateJsonMessage("Failure", "Unauthorized Login"));
  }
});

app.post("/admin/courses", adminAuthentication, async (req, res) => {
  const { title, description, price, imageLink, published } = req.body;
  const newCourseObj = {
    // courseId: Date.now(),
    title,
    description,
    price,
    imageLink,
    published,
  };
  // COURSES.push(newCourseObj);
  const newCourse = new Course(newCourseObj);
  await newCourse.save();
  res
    .status(200)
    .json(
      generateJsonMessage("Success", `Courses created successfully Course`)
    );
});

app.put("/admin/courses/:courseId", adminAuthentication, async (req, res) => {
  const { courseId } = req.params;
  // const courseToEdit = COURSES.find(
  //   course => course.courseId === parseInt(courseId)
  // );
  const { title, description, price, imageLink, published } = req.body;
  const editedObject = {
    title,
    description,
    price,
    imageLink,
    published,
  };
  const courseToEdit = await Course.findByIdAndUpdate(courseId, editedObject, {
    new: true,
  });
  if (courseToEdit) {
    // Object.assign(courseToEdit, editedObject);
    res
      .status(200)
      .json(generateJsonMessage("Success", "Course edited Successfully"));
  } else {
    res.status(404).json(generateJsonMessage("Failure", "Course cannot found"));
  }
});

app.get("/admin/courses", async (req, res) => {
  const courses = await Course.find({});
  res.status(200).json({
    status: "Success",
    data: courses,
  });
});

app.post("/users/signup", async (req, res) => {
  const { userName, password } = req.body;
  // const isUserExist = USERS.find(user => user.userName === userName);
  const isUserExist = await User.findOne({ userName });
  if (isUserExist) {
    return res
      .status(400)
      .json(generateJsonMessage("Failure", "User already exist"));
  } else {
    const newUserObj = {
      userName,
      password,
      // purchasedCourses: [],
    };
    // USERS.push(newUserObj);
    const newUser = new User(newUserObj);
    newUser.save();
    const token = generateUserJWT(newUserObj);
    res
      .status(200)
      .json(generateJsonMessage("Success", "User created successfully", token));
  }
});

app.post("/users/login", async (req, res) => {
  const { username: userName, password } = req.headers;
  // const isUserExist = USERS.find(
  //   user => user.userName === username && user.password === password
  // );
  const isUserExist = await User.findOne({ userName, password });
  if (isUserExist) {
    const token = generateUserJWT(isUserExist);
    res
      .status(200)
      .json(
        generateJsonMessage("Success", "Login authorized successfully", token)
      );
  } else {
    res.status(400).json(generateJsonMessage("Failure", "Unauthorized Login"));
  }
});

app.get("/users/courses", userAuthentication, async (req, res) => {
  const courses = await Course.find({ published: true });
  res.status(200).json(courses);
});

app.post("/users/courses/:courseId", userAuthentication, async (req, res) => {
  const { courseId } = req.params;
  // const fetchedCourse = COURSES.find(
  //   course => course.courseId === parseInt(courseId)
  // );
  const fetchedCourse = await Course.findById(courseId);
  if (fetchedCourse) {
    const { userName } = req.user;
    // const fetchUserToAddCourse = USERS.find(user => user.userName === userName);
    const fetchUserToAddCourse = await User.findOne({ userName });
    if (fetchUserToAddCourse) {
      fetchUserToAddCourse.purchasedCourses.push(fetchedCourse);
      await fetchUserToAddCourse.save();
      res
        .status(200)
        .json(generateJsonMessage("Success", "Course purchased successfully"));
    } else {
      res.status(403).json(generateJsonMessage("Failure", "User not found"));
    }
    // Object.assign(fetchUserToAddCourse, {
    //   ...fetchUserToAddCourse,
    //   purchasedCourses: [
    //     ...fetchUserToAddCourse.purchasedCourses,
    //     fetchedCourse,
    //   ],
    // });
  } else {
    res.status(404).json(generateJsonMessage("Failure", "Course ID Invalid"));
  }
});

app.get("/users/purchasedCourses", userAuthentication, async (req, res) => {
  const { userName } = req.user;
  // const fetchedUser = USERS.find(user => user.userName === userName);
  const fetchedUser = await User.findOne({
    userName,
  }).populate("purchasedCourses");
  if (fetchedUser) {
    res.status(200).json({
      purchasedCourses: fetchedUser.purchasedCourses || [],
    });
  } else {
    res.status(400).json(generateJsonMessage("Failure", "User not found"));
  }
});

app.use((req, res, next) => {
  res.status(404).json(generateJsonMessage("failure", "Route Not Found"));
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
