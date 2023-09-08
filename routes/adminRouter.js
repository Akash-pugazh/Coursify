const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { Admins, Courses, Users } = require("../db/index");
const {
  privateKey,
  authenticateJwt,
} = require("../middleware/authenticateJwt");

const router = express.Router();

// Admin routes

router.get("/me", authenticateJwt, (req, res) => {
  res.json({
    username: req.user.username,
  });
});

router.post("/signup", async (req, res) => {
  // logic to sign up admin
  const { username, password } = req.headers;
  const admin = await Admins.findOne({ username });
  if (admin) {
    res.status(403).json({ message: "Admin already exists" });
  } else {
    const newAdmin = new Admins({ username, password });
    await newAdmin.save();
    const token = jwt.sign({ username, role: "admin" }, privateKey, {
      expiresIn: "1h",
    });
    res.json({ message: "Admin created successfully", token });
  }
});

router.post("/login", async (req, res) => {
  // logic to log in admin
  const { username, password } = req.headers;

  const admin = await Admins.findOne({ username, password });
  if (admin) {
    const token = jwt.sign({ username, role: "admin" }, privateKey, {
      expiresIn: "1h",
    });
    res.json({ message: "Logged in successfully", token });
  } else {
    res.status(403).json({ message: "Invalid username or password" });
  }
});

router.post("/courses", authenticateJwt, async (req, res) => {
  // logic to create a course
  const course = new Courses(req.body);
  try {
    await course.save();
  } catch {
    console.log("save error");
    res.status(501).json({
      message: "server side error, couldn't save the course",
    });
  }

  res.json({ message: "Course created successfully", courseId: course.id });
});

router.put("/courses/:courseId", authenticateJwt, async (req, res) => {
  // logic to edit a course
  const courseId = req.params.courseId;

  const course = await Courses.findByIdAndUpdate(courseId, req.body, {
    new: true,
  });
  if (course) {
    res.json({ message: "Course updated successfully" });
  } else {
    res.status(404).json({ message: "Course not found" });
  }
});

// logic to delete a course
router.delete("/courses/:courseId", authenticateJwt, async (req, res) => {
  const courseId = req.params.courseId;

  try {
    const deletedCourse = await Courses.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Remove the deleted course from all users' purchased array
    await Users.updateMany(
      { purchased: courseId },
      { $pull: { purchased: courseId } },
    );

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Server side error, couldn't delete the course " + error,
    });
  }
});

router.get("/courses", authenticateJwt, async (req, res) => {
  // logic to get all courses
  const courses = await Courses.find();

  res.json({ courses });
});

router.get("/courses/:courseId", authenticateJwt, async (req, res) => {
  // logic to get all courses
  const courseId = req.params.courseId;
  const course = await Courses.findOne({ _id: courseId });

  res.json({ course });
});

module.exports = router;
