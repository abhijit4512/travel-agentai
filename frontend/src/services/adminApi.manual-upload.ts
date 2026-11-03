// Copy these two methods into the existing adminApi object in adminApi.ts.
// They reuse the existing req() helper and admin authentication token.
uploadImage: async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return req<{ ok: boolean; item: {
    url: string; alt: string; attribution: string; attribution_uri: string;
    provider: string; license?: string; license_uri?: string;
    photo_uri?: string; source_id?: string;
  } }>("/images/upload", { method: "POST", body: form });
},

// Keep your existing searchImages and saveImageSelection methods too.
