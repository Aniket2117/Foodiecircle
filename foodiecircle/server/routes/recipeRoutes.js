const express = require("express");
const router = express.Router();
const Recipe = require("../models/Recipe");

// GET recipes with filter + sort
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = {};

    if (category && category !== "All") {
      query.category = category.toLowerCase();
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const recipes = await Recipe.find(query);

    res.json(recipes);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;