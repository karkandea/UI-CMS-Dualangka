export async function uploadArticleCover(slug, file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "dualangka_preset");
  
  // Nembak ke endpoint Cloudinary
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dow7nf1no/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );
  
  const data = await res.json();
  return data.secure_url;
}
