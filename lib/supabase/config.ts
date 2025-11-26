const getEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : null;
};

export const getSupabaseConfig = () => {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
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
