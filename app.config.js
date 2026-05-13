const fs = require('fs');
const path = require('path');

const appJson = require('./app.json');

function loadLocalEnv() {
  const envPath = path.resolve(__dirname, '.env', '.env');

  if (!fs.existsSync(envPath)) {
    return {};
  }

  return fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return env;
      }

      const separatorIndex = trimmedLine.indexOf('=');

      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1).trim();

      env[key] = value;
      process.env[key] = process.env[key] || value;

      return env;
    }, {});
}

const localEnv = loadLocalEnv();

module.exports = {
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || localEnv.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || localEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
};
