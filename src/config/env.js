export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};

export function validateEnv() {
  const missingVars = [];

  if (!env.supabaseUrl) {
    missingVars.push('EXPO_PUBLIC_SUPABASE_URL');
  }

  if (!env.supabaseAnonKey) {
    missingVars.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (missingVars.length > 0) {
    throw new Error(`Variaveis de ambiente ausentes: ${missingVars.join(', ')}`);
  }
}
