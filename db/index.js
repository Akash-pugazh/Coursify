const mongoose = require('mongoose');


// define schemas
const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
})

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  purchased: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Courses' }]
})

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  imageLink: String,
  published: Boolean
});

// define models
const Users = mongoose.model("Users", userSchema);
const Admins = mongoose.model('Admins', adminSchema);
const Courses = mongoose.model('Courses', courseSchema);

module.exports = {
  Users, Admins, Courses
};