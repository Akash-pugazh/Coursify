const express = require("express");
const fs = require("fs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const PORT = 3000;
app.use(express.json());
app.use(cors());

let ADMINS = [];
let USERS = [];
let COURSES = [];

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

app.post("/admin/signup", (req, res) => {
  const { userName, password } = req.body;
  const isAdminExist = ADMINS.find(admin => admin.userName === userName);
  if (isAdminExist) {
    return res
      .status(400)
      .json(generateJsonMessage("Failure", "Admin already exist"));
  } else {
    const newAdminObj = {
      userName,
      password,
    };
    const token = generateAdminJWT(newAdminObj);
    ADMINS.push(newAdminObj);
    res
      .status(200)
      .json(
        generateJsonMessage("Success", "Admin created successfully", token)
      );
  }
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.headers;
  console.log(username, password);
  console.log(ADMINS);
  const isAdminExist = ADMINS.find(
    admin => admin.userName === username && admin.password === password
  );
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

app.post("/admin/courses", adminAuthentication, (req, res) => {
  const { title, description, price, imageLink, published } = req.body;
  const newCourseObj = {
    courseId: Date.now(),
    title,
    description,
    price,
    imageLink,
    published,
  };
  COURSES.push(newCourseObj);
  res
    .status(200)
    .json(
      generateJsonMessage(
        "Success",
        `Courses created successfully Course id:${newCourseObj.courseId}`
      )
    );
});

app.put("/admin/courses/:courseId", adminAuthentication, (req, res) => {
  const { courseId } = req.params;
  const courseToEdit = COURSES.find(
    course => course.courseId === parseInt(courseId)
  );
  if (courseToEdit) {
    const { title, description, price, imageLink, published } = req.body;
    const editedObject = {
      title,
      description,
      price,
      imageLink,
      published,
    };
    Object.assign(courseToEdit, editedObject);
    res
      .status(200)
      .json(generateJsonMessage("Success", "Course edited Successfully"));
  } else {
    res.status(404).json(generateJsonMessage("Failure", "Course cannot found"));
  }
});

app.get("/admin/courses", (req, res) => {
  res.status(200).json({
    status: "Success",
    data: COURSES,
  });
});

app.post("/users/signup", (req, res) => {
  const { userName, password } = req.body;
  const isUserExist = USERS.find(user => user.userName === userName);
  if (isUserExist) {
    return res
      .status(400)
      .json(generateJsonMessage("Failure", "User already exist"));
  } else {
    const newUserObj = {
      userName,
      password,
      purchasedCourses: [],
    };
    const token = generateUserJWT(newUserObj);
    USERS.push(newUserObj);
    res
      .status(200)
      .json(generateJsonMessage("Success", "User created successfully", token));
  }
});

app.post("/users/login", (req, res) => {
  const { username, password } = req.headers;
  const isUserExist = USERS.find(
    user => user.userName === username && user.password === password
  );
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

app.get("/users/courses", userAuthentication, (req, res) => {
  res.status(200).json(COURSES);
});

app.post("/users/courses/:courseId", userAuthentication, (req, res) => {
  const { courseId } = req.params;
  const fetchedCourse = COURSES.find(
    course => course.courseId === parseInt(courseId)
  );
  if (fetchedCourse) {
    const { userName } = req.user;
    const fetchUserToAddCourse = USERS.find(user => user.userName === userName);
    Object.assign(fetchUserToAddCourse, {
      ...fetchUserToAddCourse,
      purchasedCourses: [
        ...fetchUserToAddCourse.purchasedCourses,
        fetchedCourse,
      ],
    });
    res
      .status(200)
      .json(generateJsonMessage("Success", "Course added successfully"));
  } else {
    res.status(404).json(generateJsonMessage("Failure", "Course ID Invalid"));
  }
});

app.get("/users/purchasedCourses", userAuthentication, (req, res) => {
  const { userName } = req.user;
  const fetchedUser = USERS.find(user => user.userName === userName);
  if (fetchedUser) {
    res.status(200).json({
      purchasedCourses: fetchedUser.purchasedCourses,
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
