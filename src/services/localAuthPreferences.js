import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_EMAIL_KEY = '@doafacil:last_email';

export async function saveLastEmail(email) {
  if (!email) {
    return;
  }

  await AsyncStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
}

export async function getLastEmail() {
  return AsyncStorage.getItem(LAST_EMAIL_KEY);
}
