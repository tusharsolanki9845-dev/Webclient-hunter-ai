const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const overpassUrl = "https://overpass-api.de/api/interpreter";

function buildOverpassQuery(niche, location) {
  return `
    [out:json][timeout:25];
    area["name"="${location}"]->.searchArea;
    (
      node["name"]["amenity"="${niche}"](area.searchArea);
      way["name"]["amenity"="${niche}"](area.searchArea);
      relation["name"]["amenity"="${niche}"](area.searchArea);
      node["name"]["shop"="${niche}"](area.searchArea);
      way["name"]["shop"="${niche}"](area.searchArea);
      relation["name"]["shop"="${niche}"](area.searchArea);
    );
    out center tags 50;
  `;
}

async function searchBusinesses(req, res) {
  try {
    const { niche, location } = req.query;

    if (!niche || !location) {
      return res.status(400).json({
        success: false,
        message: "niche and location are required"
      });
    }

    const query = buildOverpassQuery(niche.toLowerCase(), location);

    const response = await fetch(overpassUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "Overpass API request failed"
      });
    }

    const data = await response.json();

    const businesses = (data.elements || []).map((item) => ({
      name: item.tags?.name || "Unnamed Business",
      url: item.tags?.website || item.tags?.["contact:website"] || "",
      niche,
      location,
      address:
        item.tags?.["addr:full"] ||
        item.tags?.["addr:street"] ||
        "",
      phone:
        item.tags?.phone ||
        item.tags?.["contact:phone"] ||
        "",
      lat: item.lat || item.center?.lat || null,
      lon: item.lon || item.center?.lon || null
    }));

    return res.status(200).json({
      success: true,
      count: businesses.length,
      businesses
    });
  } catch (error) {
    console.error("Search error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while searching businesses"
    });
  }
}

async function saveLead(req, res) {
  try {
    const { user_id, name, url, niche, location } = req.body;

    if (!user_id || !name || !niche || !location) {
      return res.status(400).json({
        success: false,
        message: "user_id, name, niche and location are required"
      });
    }

    const { data, error } = await supabase
      .from("leads")
      .insert([
        {
          user_id,
          name,
          url: url || "",
          niche,
          location,
          status: "new"
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase save lead error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to save lead"
      });
    }

    return res.status(201).json({
      success: true,
      lead: data
    });
  } catch (error) {
    console.error("Save lead error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while saving lead"
    });
  }
}

module.exports = {
  searchBusinesses,
  saveLead
};