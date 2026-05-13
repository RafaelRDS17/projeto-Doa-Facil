import { supabase } from '../config/supabase';

const EMAIL_CONFIRMATION_REDIRECT_URL = 'doafacil://auth';

export async function signUpWithEmail({
  email,
  password,
  name,
  phone,
  state,
  municipality,
  neighborhood,
  latitude,
  longitude,
}) {
  const { data: phoneAlreadyExists, error: phoneCheckError } = await supabase.rpc(
    'telefone_ja_cadastrado',
    {
      telefone_consulta: phone,
    },
  );

  if (phoneCheckError) {
    throw phoneCheckError;
  }

  if (phoneAlreadyExists) {
    throw new Error('Este telefone ja esta cadastrado.');
  }

  const signupMetadata = {
    nome: name,
    telefone: phone,
    estado: state,
    municipio: municipality,
    bairro: neighborhood,
    latitude,
    longitude,
  };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: signupMetadata,
      emailRedirectTo: EMAIL_CONFIRMATION_REDIRECT_URL,
    },
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    const profilePayload = {
      id: data.user.id,
      nome: name,
      email,
      telefone: phone,
      estado: state,
      municipio: municipality,
      bairro: neighborhood,
      latitude,
      longitude,
    };

    if (data.session) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        throw profileError;
      }
    }
  }

  if (data.session) {
    await supabase.auth.signOut();
  }

  return data;
}

export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function getProfileByUserId(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getValidatedSession() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return {
      session: null,
      profile: null,
    };
  }

  const profile = await getProfileByUserId(session.user.id);

  if (!profile) {
    await signOut();

    return {
      session: null,
      profile: null,
    };
  }

  return {
    session,
    profile,
  };
}

export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
