import { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;
const API = "https://www.themealdb.com/api/json/v1/1";

export default function App() {
  const [dbRecipes, setDbRecipes] = useState([]);
  const [apiRecipes, setApiRecipes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(localStorage.getItem("user"));
  const [showAuth, setShowAuth] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const [savedRecipes, setSavedRecipes] = useState([]);

  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
  });

  const [uploadForm, setUploadForm] = useState({
    title: "",
    category: "",
    ingredients: "",
    steps: "",
    file: null,
  });

  const categories = [
    "All","Breakfast","Chicken","Dessert","Goat","Lamb",
    "Miscellaneous","Pasta","Pork","Seafood","Side",
    "Starter","Vegan","Vegetarian",
  ];

  // ================= FETCH DB =================
  useEffect(() => {
    axios.get(`${BASE_URL}/api/recipes`)
      .then((res) => setDbRecipes(res.data))
      .catch(() => {});
  }, []);

  // ================= FETCH API =================
  useEffect(() => {
    fetchMeals();
  }, [search, category]);

  const fetchMeals = async () => {
    setLoading(true);
    try {
      let meals = [];

      if (category === "All") {
        const res = await axios.get(`${API}/search.php?s=${search}`);
        meals = res.data.meals || [];
      } else {
        const res = await axios.get(`${API}/filter.php?c=${category}`);
        const basicMeals = res.data.meals || [];

        const fullMeals = await Promise.all(
          basicMeals.slice(0, 6).map(async (meal) => {
            const detail = await axios.get(`${API}/lookup.php?i=${meal.idMeal}`);
            return detail.data.meals[0];
          })
        );

        meals = fullMeals;
      }

      setApiRecipes(meals);
    } catch {}
    setLoading(false);
  };

  const allRecipes = [...dbRecipes, ...apiRecipes];

  const filteredRecipes = allRecipes.filter((r) => {
    if (!r) return false;
    const name = r.title || r.strMeal || "";
    const cat = r.category || r.strCategory || "";

    return (
      (category === "All" || cat === category) &&
      name.toLowerCase().includes(search.toLowerCase())
    );
  });

  // ================= DETAILS =================
  const fetchMealDetails = async (id) => {
    const dbItem = allRecipes.find((r) => r._id === id);

    if (dbItem) {
      setSelected({
        ...dbItem,
        image: dbItem.image?.startsWith("http")
          ? dbItem.image
          : `${BASE_URL}${dbItem.image}`,
        ingredients: Array.isArray(dbItem.ingredients)
          ? dbItem.ingredients
          : (dbItem.ingredients || "").split(","),
        steps: Array.isArray(dbItem.steps)
          ? dbItem.steps
          : (dbItem.steps || "").split(","),
      });
      return;
    }

    const res = await axios.get(`${API}/lookup.php?i=${id}`);
    setSelected(res.data.meals[0]);
  };

  // ================= AUTH =================
  const handleLogin = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, authForm);
      localStorage.setItem("user", res.data.userId);
      setUser(res.data.userId);
      setShowAuth(false);
      fetchSaved();
      alert("Login successful ✅");
    } catch {
      alert("Login failed ❌");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setSavedRecipes([]);
  };

  // ================= SAVE =================
  const saveRecipe = async (recipe) => {
    if (!user) return alert("Login first!");
    await axios.post(`${BASE_URL}/api/recipes/save/${recipe._id}`, {
      userId: user,
    });
    fetchSaved();
  };

  const unsaveRecipe = async (recipe) => {
    await axios.post(`${BASE_URL}/api/recipes/unsave/${recipe._id}`, {
      userId: user,
    });
    fetchSaved();
  };

  const fetchSaved = async () => {
    const res = await axios.get(`${BASE_URL}/api/recipes`);
    setSavedRecipes(res.data.filter(r => r.savedBy?.includes(user)));
  };

  // ================= UPLOAD =================
  const handleUpload = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const formData = new FormData();
    formData.append("title", uploadForm.title);
    formData.append("category", uploadForm.category);
    formData.append("ingredients", JSON.stringify(uploadForm.ingredients.split(",")));
    formData.append("steps", JSON.stringify(uploadForm.steps.split(",")));
    formData.append("image", uploadForm.file);
    formData.append("userId", user);

    const res = await axios.post(`${BASE_URL}/api/recipes/upload`, formData);

    setDbRecipes((prev) => [res.data, ...prev]);
    alert("Uploaded!");
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] to-[#1a1235] text-white p-6">

      {/* NAVBAR */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🍽 FoodieCircle</h1>

        <input
          placeholder="Search recipes..."
          className="w-[400px] px-4 py-2 rounded-full bg-white/10"
          onChange={(e) => setSearch(e.target.value)}
        />

        {user ? (
          <div className="flex gap-3">
            <button onClick={fetchSaved}>👤 {user}</button>
            <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded">
              Logout
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAuth(true)} className="bg-pink-500 px-4 py-2 rounded">
            Login
          </button>
        )}
      </div>

      {/* CATEGORY */}
      <div className="flex gap-3 mb-6 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full ${
              category === cat ? "bg-pink-500" : "bg-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {loading ? (
          <p>Loading...</p>
        ) : (
          filteredRecipes.map((meal) => (
            <div
              key={meal._id || meal.idMeal}
              onClick={() => fetchMealDetails(meal._id || meal.idMeal)}
              className="relative bg-white/5 rounded-xl overflow-hidden cursor-pointer hover:scale-105"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  saveRecipe(meal);
                }}
                className="absolute top-2 right-2 bg-black/50 px-2 rounded"
              >
                ❤️
              </button>

              <img
                src={
                  meal.image
                    ? meal.image.startsWith("http")
                      ? meal.image
                      : `${BASE_URL}${meal.image}`
                    : meal.strMealThumb
                }
                className="h-40 w-full object-cover"
              />

              <div className="p-3">
                <h3>{meal.title || meal.strMeal}</h3>
                <p className="text-sm opacity-70">
                  {meal.category || meal.strCategory}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

