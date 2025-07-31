const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Set EJS sebagai template engine (tetap perlu untuk download.ejs)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// fungsi download FB
async function facebookDl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await axios.post(
        "https://getmyfb.com/process",
        new URLSearchParams({
          id: decodeURIComponent(url),
          locale: "en",
        }),
        {
          headers: {
            "hx-current-url": "https://getmyfb.com/",
            "hx-request": "true",
            "hx-target": url.includes("share")
              ? "#private-video-downloader"
              : "#target",
            "hx-trigger": "form",
            "hx-post": "/process",
            "hx-swap": "innerHTML",
          },
        }
      );

      const $ = cheerio.load(data);
      const results = $(".results-list-item")
        .get()
        .map((el) => ({
          quality: $(el).text().trim() || "",
          type: $(el).text().includes("HD") ? "HD" : "SD",
          url: $(el).find("a").attr("href") || "",
        }));

      const filteredResults = results.filter(
        (item) => item.quality && item.url
      );

      resolve({
        caption:
          $(".results-item-text").length > 0
            ? $(".results-item-text").text().trim()
            : "Video Facebook", // Default caption lebih umum
        preview: $(".results-item-image").attr("src") || "",
        results: filteredResults,
      });
    } catch (e) {
      console.error("Facebook Download Error:", e);
      reject(e);
    }
  });
}

// route utama untuk form input
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// route untuk proses download
app.post("/download", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.redirect("/?error=no_url"); // Redirect dengan parameter error
    }
    const result = await facebookDl(url);
    // Render file EJS dan kirimkan data
    res.render("download", {
      title: result.caption,
      preview: result.preview,
      results: result.results,
    });
  } catch (err) {
    console.error("Download route error:", err);
    // Redirect kembali ke halaman utama dengan parameter error
    res.redirect("/?error=failed_download");
  }
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
