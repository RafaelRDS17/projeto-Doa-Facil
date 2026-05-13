import { supabase } from '../config/supabase';
import { removeFileFromBucket, uploadImageToBucket } from './storageImageService';

const AVATAR_BUCKET = 'avatars';
const PROFILE_USER_FIELD = 'id';

function hasColumn(row, columnName) {
  return Object.prototype.hasOwnProperty.call(row || {}, columnName);
}

function profileMatchesUpdate(profile, updateData, hasNewPhoto) {
  const textFieldsMatch =
    profile.nome === updateData.nome &&
    profile.telefone === updateData.telefone &&
    profile.estado === updateData.estado &&
    profile.municipio === updateData.municipio &&
    profile.bairro === updateData.bairro;

  if (!hasNewPhoto) {
    return textFieldsMatch;
  }

  return textFieldsMatch && profile.avatar_path === updateData.avatar_path;
}

async function uploadProfilePhoto({ userId, photoUri }) {
  return uploadImageToBucket({
    bucket: AVATAR_BUCKET,
    userId,
    photoUri,
    missingPhotoMessage: 'Foto de perfil nao encontrada.',
    emptyPhotoMessage: 'A foto selecionada esta vazia. Escolha outra foto.',
    readPhotoMessage: 'Nao foi possivel ler a foto de perfil.',
    bucketNotFoundMessage: 'Bucket avatars nao encontrado. Crie o bucket no Supabase antes de salvar foto.',
  });
}

export async function updateUserProfile({
  name,
  phone,
  state,
  municipality,
  neighborhood,
  currentAvatarPath,
  newPhotoUri,
}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const userId = sessionData.session?.user?.id;

  if (!userId) {
    throw new Error('Sua sessao expirou. Faca login novamente.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq(PROFILE_USER_FIELD, userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const hasNewPhoto = Boolean(newPhotoUri);
  const canUseAvatarColumns =
    !profile || (hasColumn(profile, 'avatar_url') && hasColumn(profile, 'avatar_path'));

  if (hasNewPhoto && profile && !canUseAvatarColumns) {
    throw new Error(
      'As colunas avatar_url e avatar_path ainda nao existem em profiles. Rode o SQL informado.',
    );
  }

  const updateData = {
    nome: name,
    telefone: phone,
    estado: state,
    municipio: municipality,
    bairro: neighborhood,
  };

  let uploadedPhoto = null;
  let oldAvatarPathToRemove = null;

  if (hasNewPhoto) {
    uploadedPhoto = await uploadProfilePhoto({
      userId,
      photoUri: newPhotoUri,
    });

    updateData.avatar_url = uploadedPhoto.publicUrl;
    updateData.avatar_path = uploadedPhoto.filePath;
    oldAvatarPathToRemove = currentAvatarPath || profile?.avatar_path;
  }

  const payload = profile
    ? updateData
    : {
        [PROFILE_USER_FIELD]: userId,
        ...updateData,
      };

  const query = profile
    ? supabase.from('profiles').update(payload).eq(PROFILE_USER_FIELD, userId)
    : supabase.from('profiles').insert(payload);

  const { error } = await query;

  if (error) {
    if (uploadedPhoto?.filePath) {
      await removeFileFromBucket({
        bucket: AVATAR_BUCKET,
        filePath: uploadedPhoto.filePath,
      });
    }

    if (error.code === '23505') {
      throw new Error('Este telefone ja esta cadastrado.');
    }

    if (error.code === '42703' && error.message?.includes('avatar')) {
      throw new Error(
        'As colunas avatar_url e avatar_path ainda nao existem em profiles. Rode o SQL informado.',
      );
    }

    throw error;
  }

  const { data: savedProfile, error: savedProfileError } = await supabase
    .from('profiles')
    .select('*')
    .eq(PROFILE_USER_FIELD, userId)
    .maybeSingle();

  if (savedProfileError) {
    if (uploadedPhoto?.filePath) {
      await removeFileFromBucket({
        bucket: AVATAR_BUCKET,
        filePath: uploadedPhoto.filePath,
      });
    }

    throw savedProfileError;
  }

  if (!savedProfile) {
    if (uploadedPhoto?.filePath) {
      await removeFileFromBucket({
        bucket: AVATAR_BUCKET,
        filePath: uploadedPhoto.filePath,
      });
    }

    throw new Error('Perfil salvo, mas nao foi possivel recarregar os dados.');
  }

  if (!profileMatchesUpdate(savedProfile, updateData, hasNewPhoto)) {
    if (uploadedPhoto?.filePath) {
      await removeFileFromBucket({
        bucket: AVATAR_BUCKET,
        filePath: uploadedPhoto.filePath,
      });
    }

    throw new Error('Perfil nao atualizado. Verifique a policy de UPDATE em profiles.');
  }

  if (oldAvatarPathToRemove && oldAvatarPathToRemove !== savedProfile.avatar_path) {
    await removeFileFromBucket({
      bucket: AVATAR_BUCKET,
      filePath: oldAvatarPathToRemove,
    });
  }

  return savedProfile;
}
