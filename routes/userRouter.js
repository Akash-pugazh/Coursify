const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { Users, Admins, Courses } = require("../db/index");
const {
  privateKey,
  authenticateJwt,
} = require("../middleware/authenticateJwt");

const router = express.Router();

// User routes
router.post("/signup", async (req, res) => {
  // logic to sign up user
  const { username, password } = req.body;

  // check if user already exists
  const user = await Users.findOne({ username });

  if (user) {
    res.status(403).json({ message: "user already exists" });
  } else {
    const token = jwt.sign({ username, role: "user" }, privateKey, {
      expiresIn: "1h",
    });
    const newUser = new Users({ username, password });
    await newUser.save();
    res.json({ message: "User created successfully", token });
  }
});

router.post("/login", async (req, res) => {
  // logic to log in user
  const { username, password } = req.headers;

  // check if valid credentials
  const user = await Users.findOne({ username, password });

  if (user) {
    const token = jwt.sign({ username, role: "user" }, privateKey, {
      expiresIn: "1h",
    });
    res.json({ message: "Logged in successfully", token });
  } else {
    res.status(403).json({ message: "Invalid username or password" });
  }
});

router.get("/courses", authenticateJwt, async (req, res) => {
  // logic to list all courses
  const courses = await Courses.find({ published: true });

  res.json({ courses });
});

// logic to purchase course
router.post("/courses/:courseId", authenticateJwt, async (req, res) => {
  const courseId = req.params.courseId;

  const course = await Courses.findById(courseId);

  if (course) {
    const username = req.user.username;
    const user = await Users.findOne({ username });

    if (user) {
      user.purchased.push(courseId); // Add the courseId to the purchased array
      await user.save();
      res.json({ message: "Course purchased successfully" });
    } else {
      res.status(403).json({ message: "User not found" });
    }
  } else {
    res.status(404).json({ message: "Course not found" });
  }
});

router.get("/purchasedCourses", authenticateJwt, async (req, res) => {
  // logic to view purchased courses
  const username = req.user.username;
  const user = await Users.findOne({ username }).populate("purchased");
  if (user) {
    res.json({ purchasedCourses: user.purchased || [] });
  } else {
    res.status(403).json({ message: "User not found" });
  }
});

// check if user is enrolled in a course
router.get("/course/:courseId", authenticateJwt, async (req, res) => {
  try {
    const username = req.user.username;
    const user = await Users.findOne({ username }).populate("purchased");
    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }

    const courseId = req.params.courseId;
    const course = await Courses.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const isEnrolled = user.purchased.some((purchasedCourse) =>
      purchasedCourse._id.equals(courseId)
    );

    res.json({ enrolled: isEnrolled });
  } catch (err) {
    console.error("Error checking course enrollment:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;

