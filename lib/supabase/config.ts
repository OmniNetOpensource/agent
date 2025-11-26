const getEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : null;
};

export const getSupabaseConfig = () => {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return { supabaseUrl, supabaseAnonKey };
};

export const hasSupabaseConfig = () => {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    return Boolean(supabaseUrl && supabaseAnonKey);
  } catch {
    return false;
  }
};
