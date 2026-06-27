const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.log("No Supabase credentials.");
  process.exit(1);
}

fetch(`${url}/rest/v1/?apikey=${key}`)
  .then(res => res.json())
  .then(data => {
    const schemas = data.definitions || (data.components && data.components.schemas) || {};
    if (schemas['leadium_displacements']) {
       const props = schemas['leadium_displacements'].properties;
       console.log("Columns for leadium_displacements:", Object.keys(props).join(', '));
    } else {
       console.log("leadium_displacements not found in schemas");
    }
  })
  .catch(err => console.error("Error:", err));
