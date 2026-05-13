import { supabase } from '../config/supabase';
import { removeFileFromBucket, uploadImageToBucket } from './storageImageService';

const ITEM_BUCKET = 'items';
const PUBLIC_PROFILE_FIELDS = 'id, nome, estado, municipio, bairro, avatar_url';

async function uploadItemPhoto({ userId, photoUri }) {
  return uploadImageToBucket({
    bucket: ITEM_BUCKET,
    userId,
    photoUri,
    missingPhotoMessage: 'Foto do item nao encontrada.',
    emptyPhotoMessage: 'A foto selecionada esta vazia. Tire a foto novamente.',
    readPhotoMessage: 'Nao foi possivel ler a foto do item. Tire a foto novamente.',
    bucketNotFoundMessage: 'Bucket items nao encontrado. Verifique o Supabase Storage.',
  });
}

async function getAuthenticatedUserId() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const userId = sessionData.session?.user?.id;

  if (!userId) {
    throw new Error('Sua sessao expirou. Faca login novamente.');
  }

  return userId;
}

async function getPublicProfilesByUserIds(userIds) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (!uniqueUserIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('public_profiles')
    .select(PUBLIC_PROFILE_FIELDS)
    .in('id', uniqueUserIds);

  if (error) {
    throw error;
  }

  return new Map((data || []).map((profile) => [profile.id, profile]));
}

async function attachPublicDonorProfiles(items) {
  const itemList = Array.isArray(items) ? items : [items];
  const profileByUserId = await getPublicProfilesByUserIds(itemList.map((item) => item.user_id));
  const enrichedItems = itemList.map((item) => ({
    ...item,
    profiles: profileByUserId.get(item.user_id) || null,
  }));

  return Array.isArray(items) ? enrichedItems : enrichedItems[0];
}

export async function createDonationItem({ title, description, category, photoUri }) {
  const userId = await getAuthenticatedUserId();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new Error('Sua sessao expirou. Faca login novamente.');
  }

  const uploadedPhoto = await uploadItemPhoto({
    userId,
    photoUri,
  });

  const donationData = {
    user_id: userId,
    titulo: title,
    descricao: description,
    categoria: category,
    image_url: uploadedPhoto.publicUrl,
    image_path: uploadedPhoto.filePath,
    status: 'available',
  };

  const { data, error } = await supabase
    .from('items')
    .insert(donationData)
    .select(
      `
        id,
        titulo,
        descricao,
        categoria,
        status,
        criado_em,
        user_id,
        image_url,
        image_path
      `,
    )
    .single();

  if (error) {
    await removeFileFromBucket({
      bucket: ITEM_BUCKET,
      filePath: uploadedPhoto.filePath,
    });

    throw error;
  }

  return data;
}

export async function updateDonationItem({
  itemId,
  title,
  description,
  category,
  currentImagePath,
  newPhotoUri,
}) {
  const userId = await getAuthenticatedUserId();

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id, user_id, image_path')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) {
    throw itemError;
  }

  if (!item) {
    throw new Error('Doacao nao encontrada.');
  }

  if (item.user_id !== userId) {
    throw new Error('Voce nao tem permissao para editar esta doacao.');
  }

  const updateData = {
    titulo: title,
    descricao: description,
    categoria: category,
  };

  let uploadedPhoto = null;
  let oldImagePathToRemove = null;

  if (newPhotoUri) {
    uploadedPhoto = await uploadItemPhoto({
      userId,
      photoUri: newPhotoUri,
    });

    updateData.image_url = uploadedPhoto.publicUrl;
    updateData.image_path = uploadedPhoto.filePath;
    oldImagePathToRemove = currentImagePath || item.image_path;
  }

  const { data, error } = await supabase
    .from('items')
    .update(updateData)
    .eq('id', itemId)
    .eq('user_id', userId)
    .select(
      `
        id,
        titulo,
        descricao,
        categoria,
        status,
        criado_em,
        user_id,
        image_url,
        image_path
      `,
    )
    .maybeSingle();

  if (error) {
    if (uploadedPhoto?.filePath) {
      await removeFileFromBucket({
        bucket: ITEM_BUCKET,
        filePath: uploadedPhoto.filePath,
      });
    }

    throw error;
  }

  if (!data) {
    if (uploadedPhoto?.filePath) {
      await removeFileFromBucket({
        bucket: ITEM_BUCKET,
        filePath: uploadedPhoto.filePath,
      });
    }

    throw new Error('Doacao nao atualizada. Verifique sua permissao.');
  }

  if (oldImagePathToRemove && oldImagePathToRemove !== data.image_path) {
    await removeFileFromBucket({
      bucket: ITEM_BUCKET,
      filePath: oldImagePathToRemove,
    });
  }

  return attachPublicDonorProfiles(data);
}

export async function listDonationItems() {
  const { data, error } = await supabase
    .from('items')
    .select(
      `
        id,
        titulo,
        descricao,
        categoria,
        status,
        criado_em,
        user_id,
        image_url,
        image_path
      `,
    )
    .in('status', ['available', 'reserved'])
    .order('criado_em', { ascending: false });

  if (error) {
    throw error;
  }

  return attachPublicDonorProfiles(data || []);
}

export async function deleteDonationItem(itemId) {
  const userId = await getAuthenticatedUserId();

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id, user_id, image_path')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) {
    throw itemError;
  }

  if (!item) {
    throw new Error('Doacao nao encontrada.');
  }

  if (item.user_id !== userId) {
    throw new Error('Voce nao tem permissao para apagar esta doacao.');
  }

  const { error } = await supabase.from('items').delete().eq('id', itemId).eq('user_id', userId);

  if (error) {
    throw error;
  }

  if (item.image_path) {
    await removeFileFromBucket({
      bucket: ITEM_BUCKET,
      filePath: item.image_path,
    });
  }
}
