import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '../config/supabase';

function base64ToUint8Array(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const cleanBase64 = base64.replace(/=+$/, '');
  const bytes = [];
  let buffer = 0;
  let bits = 0;

  for (let index = 0; index < cleanBase64.length; index += 1) {
    const value = chars.indexOf(cleanBase64[index]);

    if (value === -1) {
      continue;
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

export async function uploadImageToBucket({
  bucket,
  userId,
  photoUri,
  missingPhotoMessage,
  emptyPhotoMessage,
  readPhotoMessage,
  bucketNotFoundMessage,
}) {
  if (!photoUri) {
    throw new Error(missingPhotoMessage || 'Imagem nao encontrada.');
  }

  const fileInfo = await FileSystem.getInfoAsync(photoUri, { size: true });

  if (!fileInfo.exists || !fileInfo.size || fileInfo.size <= 0) {
    throw new Error(emptyPhotoMessage || 'A imagem selecionada esta vazia.');
  }

  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!base64) {
    throw new Error(readPhotoMessage || 'Nao foi possivel ler a imagem selecionada.');
  }

  const fileBytes = base64ToUint8Array(base64);

  if (!fileBytes.byteLength) {
    throw new Error(emptyPhotoMessage || 'A imagem selecionada esta vazia.');
  }

  const filePath = `${userId}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, fileBytes, {
    cacheControl: '3600',
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (uploadError) {
    if (uploadError.message?.toLowerCase().includes('bucket not found')) {
      throw new Error(bucketNotFoundMessage || `Bucket ${bucket} nao encontrado.`);
    }

    throw uploadError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    publicUrl: data.publicUrl,
    filePath,
  };
}

export async function removeFileFromBucket({ bucket, filePath }) {
  if (!filePath) {
    return null;
  }

  const { error } = await supabase.storage.from(bucket).remove([filePath]);

  return error;
}
