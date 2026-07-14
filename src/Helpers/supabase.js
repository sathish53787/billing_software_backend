import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'STV Profile';

let supabaseClient = null;

export const getSupabase = () => {
  if (supabaseClient) return supabaseClient;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('Supabase configuration is missing');
  }

  supabaseClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
};

export const ensureProfilesBucket = async () => {
  const supabase = getSupabase();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(listError.message || 'Unable to list Supabase buckets');
  }

  const exists = (buckets || []).some((bucket) => bucket.name === SUPABASE_BUCKET);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(SUPABASE_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });

  if (createError && !/already exists/i.test(createError.message || '')) {
    throw new Error(createError.message || 'Unable to create Supabase bucket');
  }
};

export const uploadProfileImage = async ({ userId, file }) => {
  return uploadImageToBucket({
    folder: `users/${userId}`,
    file,
  });
};

export const uploadCompanyLogo = async ({ userId, file }) => {
  return uploadImageToBucket({
    folder: `companies/${userId}`,
    file,
  });
};

const uploadImageToBucket = async ({ folder, file }) => {
  const supabase = getSupabase();
  await ensureProfilesBucket();

  const extension = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)
    ? extension
    : 'jpg';
  const filePath = `${folder}/${Date.now()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
      cacheControl: '3600',
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload image to Supabase');
  }

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('Failed to generate public image URL');
  }

  return data.publicUrl;
};
