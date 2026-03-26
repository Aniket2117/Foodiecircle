const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema(
  {
    name: String,
    image: String,
    video: String,
    cuisine: String,
    category: String,
    ingredients: [String],
    steps: [String],
    time: Number,
    likes: { type: Number, default: 0 },
  },
  { timestamps: true } // 🔥 IMPORTANT
);

module.exports = mongoose.model("Recipe", recipeSchema);