const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const SECRET = "foodie-secret";

// ✅ CONNECT DB
// mongoose.connect("mongodb://127.0.0.1:27017/foodiecircle");\
require("dotenv").config();
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));


// ================= USER SCHEMA =================
const User = mongoose.model("User", {
  email: String,
  password: String,
  favorites: Array,
});

// ================= RECIPE SCHEMA =================
const Recipe = mongoose.model("Recipe", {
  title: String,
  category: String,
  ingredients: Array,
  steps: Array,
  image: String,
});

// ================= MULTER =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ================= AUTH MIDDLEWARE =================
const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};

// ================= REGISTER =================
app.post("/api/auth/register", async (req, res) => {
  const user = new User(req.body);
  await user.save();
  res.json({ msg: "User created" });
});

// ================= LOGIN =================
app.post("/api/auth/login", async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email,
      password: req.body.password,
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, SECRET);

    // ✅ IMPORTANT CHANGE
    res.json({
      token,
      userId: user._id,   // 🔥 THIS FIXES EVERYTHING
      email: user.email,
    });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// ================= SAVE RECIPE =================
app.post("/save", auth, async (req, res) => {
  const user = await User.findById(req.user.id);

  user.favorites.push(req.body);
  await user.save();

  res.json({ msg: "Saved!" });
});

// ================= GET SAVED =================
app.get("/saved", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.favorites);
});

// ================= UPLOAD =================
app.post("/upload", upload.single("image"), async (req, res) => {
  const recipe = new Recipe({
    title: req.body.title,
    category: req.body.category,
    ingredients: req.body.ingredients.split(","),
    steps: req.body.steps.split(","),
    image: req.file.path,
  });

  await recipe.save();
  res.json(recipe);
});

// ================= GET RECIPES =================
app.get("/recipes", async (req, res) => {
  const data = await Recipe.find().sort({ _id: -1 });
  res.json(data);
});

// ================= UNSAVE =================
app.post("/unsave", async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ msg: "No token" });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, "foodie-secret");

    const user = await User.findById(decoded.id);

    user.favorites = user.favorites.filter(
      (r) =>
        String(r._id || r.idMeal) !==
        String(req.body._id || req.body.idMeal)
    );

    await user.save();

    res.json({ msg: "Removed" });

  } catch (err) {
    console.log("UNSAVE ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});
// ================= START =================
app.listen(5000, () => console.log("Server running 🚀"));
