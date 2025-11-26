export const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)"
    );
  }

  return { supabaseUrl, supabaseKey };
};

export const hasSupabaseConfig = () => {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    return Boolean(supabaseUrl && supabaseKey);
  } catch {
    return false;
  }
};
