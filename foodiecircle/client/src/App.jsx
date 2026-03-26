import { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = "https://foodiecircle.onrender.com";

export default function App() {
  const [dbRecipes, setDbRecipes] = useState([]);
  const [apiRecipes, setApiRecipes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const [user, setUser] = useState(localStorage.getItem("user"));
  const [showAuth, setShowAuth] = useState(false);

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

  // ================= DB =================
  useEffect(() => {
    axios.get("http://localhost:5000/recipes")
      .then((res) => setDbRecipes(res.data))
      .catch(() => {});
  }, []);

  // ================= API =================
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

  // ================= COMBINE =================
  const allRecipes = [...dbRecipes, ...apiRecipes];

  const filteredRecipes = allRecipes.filter((r) => {
    if (!r) return false;

    const name = r.title || r.strMeal || "";
    const recipeCategory = r.category || r.strCategory || "";

    return (
      (category === "All" || recipeCategory === category) &&
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
          : `http://localhost:5000/${dbItem.image}`,
        ingredients:
          typeof dbItem.ingredients === "string"
            ? dbItem.ingredients.split(",")
            : dbItem.ingredients || [],
        steps:
          typeof dbItem.steps === "string"
            ? dbItem.steps.split(",")
            : dbItem.steps || [],
      });
      return;
    }

    try {
      const res = await axios.get(`${API}/lookup.php?i=${id}`);
      setSelected(res.data.meals[0]);
    } catch {}
  };

  // ================= AUTH =================
  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/login", authForm);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", res.data.email);

      setUser(res.data.email);
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
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Login first!");
      return;
    }

    await axios.post("http://localhost:5000/save", recipe, {
      headers: { Authorization: token },
    });

    fetchSaved();
    alert("Saved ❤️");
  };

  const fetchSaved = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await axios.get("http://localhost:5000/saved", {
      headers: { Authorization: token },
    });

    setSavedRecipes(res.data);
  };

  // ================= UPLOAD =================
  const handleUpload = async () => {
    try {
      if (!user) {
        alert("⚠️ Login required!");
        setShowAuth(true);
        return;
      }

      const formData = new FormData();
      formData.append("title", uploadForm.title);
      formData.append("category", uploadForm.category);
      formData.append("ingredients", uploadForm.ingredients);
      formData.append("steps", uploadForm.steps);
      formData.append("image", uploadForm.file);

      const res = await axios.post(
        "http://localhost:5000/upload",
        formData
      );

      setDbRecipes((prev) => [res.data, ...prev]);

      setUploadForm({
        title: "",
        category: "",
        ingredients: "",
        steps: "",
        file: null,
      });

      alert("Uploaded!");
    } catch {
      alert("Upload failed");
    }
  };
  // UNSAVE
const unsaveRecipe = async (recipe) => {
  try {
    const token = localStorage.getItem("token");

    console.log("UNSAVE CLICK:", recipe); // 🔍

    const res = await axios.post(
      "http://localhost:5000/unsave",
      recipe,
      {
        headers: { Authorization: token },
      }
    );

    console.log("UNSAVE RESPONSE:", res.data);

    setSavedRecipes((prev) =>
      prev.filter(
        (r) =>
          String(r._id || r.idMeal) !==
          String(recipe._id || recipe.idMeal)
      )
    );
  } catch (err) {
    console.log("UNSAVE ERROR:", err);
    alert("Unsave failed ❌");
  }
};
  // ================= HELPERS =================
  const getIngredients = (meal) => {
    if (!meal) return [];

    if (typeof meal.ingredients === "string") {
      return meal.ingredients.split(",").map(i => i.trim());
    }

    if (Array.isArray(meal.ingredients)) return meal.ingredients;

    let list = [];
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ing && ing.trim()) list.push(`${measure} ${ing}`);
    }
    return list;
  };

  const getSteps = (meal) => {
    if (!meal) return [];

    if (typeof meal.steps === "string") {
      return meal.steps.split(",").map(s => s.trim());
    }

    if (Array.isArray(meal.steps)) return meal.steps;

    if (meal.strInstructions) {
      return meal.strInstructions.split(".").filter(s => s.trim());
    }

    return [];
  };

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

      {/* MAIN */}
      <div className="flex gap-6">

        {/* UPLOAD */}
        <div className="w-[280px] bg-white/5 p-4 rounded-xl h-fit">
          <h2 className="mb-3 font-bold">Upload Recipe</h2>

          <input placeholder="Title"
            value={uploadForm.title}
            onChange={(e)=>setUploadForm({...uploadForm,title:e.target.value})}
            className="w-full p-2 mb-2 bg-white/10 rounded" />

          <select
            value={uploadForm.category}
            onChange={(e)=>setUploadForm({...uploadForm,category:e.target.value})}
            className="w-full p-2 mb-2 bg-[#2a244d] text-white rounded"
          >
            <option value="">Select Category</option>
            {categories.slice(1).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <input type="file"
            onChange={(e)=>setUploadForm({...uploadForm,file:e.target.files[0]})}
            className="mb-2" />

          <textarea placeholder="Ingredients"
            value={uploadForm.ingredients}
            onChange={(e)=>setUploadForm({...uploadForm,ingredients:e.target.value})}
            className="w-full p-2 mb-2 bg-white/10 rounded" />

          <textarea placeholder="Steps"
            value={uploadForm.steps}
            onChange={(e)=>setUploadForm({...uploadForm,steps:e.target.value})}
            className="w-full p-2 mb-2 bg-white/10 rounded" />

          <button onClick={handleUpload} className="w-full bg-purple-500 py-2 rounded">
            Upload
          </button>
        </div>

        {/* RECIPES */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6">
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
                        : `http://localhost:5000/${meal.image}`
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

      {/* DETAILS MODAL */}
 {/* DETAILS MODAL */}
{selected && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1000]">

    {/* MODAL BOX */}
    <div className="bg-[#1a1235] rounded-xl w-[90%] max-w-[500px] max-h-[85vh] flex flex-col">

      {/* TITLE */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xl font-semibold">
          {selected.title || selected.strMeal}
        </h2>
      </div>

      {/* ✅ SCROLLABLE CONTENT (ONLY THIS SCROLLS) */}
      <div className="p-4 overflow-y-auto">

        {/* IMAGE */}
        <img
          src={selected.image || selected.strMealThumb}
          className="w-full max-h-[250px] object-cover rounded-lg mb-4"
        />

        {/* INGREDIENTS */}
        <h3 className="font-semibold mb-2">Ingredients</h3>
        <ul className="mb-4 space-y-1 text-sm opacity-90">
          {getIngredients(selected).map((i, idx) => (
            <li key={idx}>• {i}</li>
          ))}
        </ul>

        {/* STEPS */}
        <h3 className="font-semibold mb-2">Steps</h3>
        <ol className="space-y-2 text-sm opacity-90">
          {getSteps(selected).map((s, i) => (
            <li key={i}>{i + 1}. {s}</li>
          ))}
        </ol>

      </div>

      {/* ✅ BEAUTIFUL CLOSE BUTTON (BOTTOM FIXED) */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => setSelected(null)}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-105 transition"
        >
          Close Recipe
        </button>
      </div>

    </div>
  </div>
)}
      {/* PROFILE */}
     {savedRecipes.length > 0 && !selected && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col">

    {/* HEADER */}
    <div className="flex justify-between items-center p-5 border-b border-white/10">
      <h2 className="text-2xl font-semibold">Saved Recipes ❤️</h2>

      <button
        onClick={() => setSavedRecipes([])}
        className="px-4 py-2 bg-red-500 rounded-lg hover:scale-105 transition"
      >
        Close
      </button>
    </div>

    {/* CONTENT */}
    <div className="p-6 overflow-y-auto">

      {savedRecipes.length === 0 ? (
        <p className="text-center text-gray-400">
          No saved recipes yet 🍽️
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

          {savedRecipes.map((r) => (
  <div
    key={r._id || r.idMeal}
    className="relative bg-white/5 rounded-xl overflow-hidden hover:scale-105 transition duration-300 shadow-lg hover:shadow-purple-500/20"
  >

    {/* 🔥 UNSAVE BUTTON */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        unsaveRecipe(r);
      }}
      className="absolute top-2 right-2 px-3 py-1 text-xs bg-red-500/90 rounded-full hover:bg-red-600 transition"
    >
      Unsave
    </button>

    {/* CLICK AREA */}
    <div
      onClick={() => fetchMealDetails(r._id || r.idMeal)}
      className="cursor-pointer"
    >
      <img
        src={
          r.image
            ? r.image.startsWith("http")
              ? r.image
              : `http://localhost:5000/${r.image}`
            : r.strMealThumb
        }
        className="h-40 w-full object-cover"
      />

      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2">
          {r.title || r.strMeal}
        </h3>

        <p className="text-xs text-gray-400 mt-1">
          {r.category || r.strCategory || "Recipe"}
        </p>
      </div>
    </div>

  </div>
))}
        </div>
      )}
    </div>
  </div>
)}

      {/* LOGIN */}
      {showAuth && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-50">

    <div className="relative bg-gradient-to-br from-[#1a1235] to-[#2a1f5c] p-8 rounded-2xl w-[360px] shadow-2xl border border-white/10">

      {/* ❌ CLOSE BUTTON */}
      <button
        onClick={() => setShowAuth(false)}
        className="absolute top-3 right-3 text-gray-300 hover:text-white text-lg"
      >
        ✖
      </button>

      {/* TITLE */}
      <h2 className="text-2xl font-semibold text-center mb-6">
        Welcome Back 👋
      </h2>

      {/* EMAIL */}
      <input
        type="email"
        placeholder="Email"
        className="w-full p-3 mb-4 rounded-lg bg-white/10 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500"
        onChange={(e) =>
          setAuthForm({ ...authForm, email: e.target.value })
        }
      />

      {/* PASSWORD */}
      <input
        type="password"
        placeholder="Password"
        className="w-full p-3 mb-5 rounded-lg bg-white/10 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500"
        onChange={(e) =>
          setAuthForm({ ...authForm, password: e.target.value })
        }
      />

      {/* LOGIN BUTTON */}
      <button
        onClick={handleLogin}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 py-2 rounded-lg font-semibold hover:scale-105 transition"
      >
        Login
      </button>

      {/* REGISTER */}
    <button
  onClick={() => {
    setShowAuth(false);
    setShowRegister(true);
  }}
  className="w-full mt-3 text-sm text-gray-300 hover:text-white"
>
  Don’t have an account? Register
</button>
{showRegister && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50">

    <div className="relative bg-gradient-to-br from-[#1a1235] to-[#2a1f5c] p-8 rounded-2xl w-[360px] shadow-2xl border border-white/10">

      {/* ❌ CLOSE */}
      <button
        onClick={() => setShowRegister(false)}
        className="absolute top-3 right-3 text-gray-300 hover:text-white text-lg"
      >
        ✖
      </button>

      {/* TITLE */}
      <h2 className="text-2xl font-semibold text-center mb-6">
        Create Account 🚀
      </h2>

      {/* EMAIL */}
      <input
        type="email"
        placeholder="Email"
        className="w-full p-3 mb-4 rounded-lg bg-white/10 text-white outline-none focus:ring-2 focus:ring-purple-500"
        onChange={(e) =>
          setAuthForm({ ...authForm, email: e.target.value })
        }
      />

      {/* PASSWORD */}
      <input
        type="password"
        placeholder="Password"
        className="w-full p-3 mb-5 rounded-lg bg-white/10 text-white outline-none focus:ring-2 focus:ring-purple-500"
        onChange={(e) =>
          setAuthForm({ ...authForm, password: e.target.value })
        }
      />

      {/* REGISTER BUTTON */}
      <button
        onClick={async () => {
          try {
            if (!authForm.email || !authForm.password) {
              alert("Fill all fields");
              return;
            }

            await axios.post("http://localhost:5000/register", authForm);

            alert("✅ Registered! Now login");

            setShowRegister(false);
            setShowAuth(true); // 🔥 back to login
          } catch (err) {
            alert("❌ Register failed");
          }
        }}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 py-2 rounded-lg font-semibold hover:scale-105 transition"
      >
        Register
      </button>

      {/* BACK TO LOGIN */}
      <button
        onClick={() => {
          setShowRegister(false);
          setShowAuth(true);
        }}
        className="w-full mt-3 text-sm text-gray-300 hover:text-white"
      >
        Already have an account? Login
      </button>

    </div>
  </div>
)}
    </div>
  </div>
)}

    </div>
  );
}
