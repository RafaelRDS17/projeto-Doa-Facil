import { supabase } from '../config/supabase';

const REQUEST_FIELDS = 'id, item_id, donor_id, requester_id, status, message, created_at, updated_at';
const ITEM_FIELDS = 'id, titulo, descricao, categoria, status, image_url, image_path, user_id';
const PUBLIC_PROFILE_FIELDS = 'id, nome, estado, municipio, bairro, avatar_url';

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

async function getItemsByIds(itemIds) {
  const uniqueItemIds = [...new Set(itemIds.filter(Boolean))];

  if (!uniqueItemIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('items')
    .select(ITEM_FIELDS)
    .in('id', uniqueItemIds);

  if (error) {
    throw error;
  }

  return new Map((data || []).map((item) => [item.id, item]));
}

async function getPublicProfilesByIds(profileIds) {
  const uniqueProfileIds = [...new Set(profileIds.filter(Boolean))];

  if (!uniqueProfileIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('public_profiles')
    .select(PUBLIC_PROFILE_FIELDS)
    .in('id', uniqueProfileIds);

  if (error) {
    throw error;
  }

  return new Map((data || []).map((profile) => [profile.id, profile]));
}

async function enrichRequests(requests) {
  const requestList = requests || [];
  const itemById = await getItemsByIds(requestList.map((request) => request.item_id));
  const profileById = await getPublicProfilesByIds([
    ...requestList.map((request) => request.donor_id),
    ...requestList.map((request) => request.requester_id),
  ]);

  return requestList.map((request) => ({
    ...request,
    item: itemById.get(request.item_id) || null,
    donor: profileById.get(request.donor_id) || null,
    requester: profileById.get(request.requester_id) || null,
  }));
}

async function getAcceptedContactProfile(requestId) {
  const { data, error } = await supabase
    .rpc('get_accepted_request_contact', { target_request_id: requestId })
    .maybeSingle();

  if (error) {
    return null;
  }

  return data || null;
}

function attachContactProfile(request, contactProfile) {
  if (!contactProfile?.id) {
    return request;
  }

  if (contactProfile.id === request.donor_id) {
    return {
      ...request,
      donor: {
        ...(request.donor || {}),
        ...contactProfile,
      },
    };
  }

  if (contactProfile.id === request.requester_id) {
    return {
      ...request,
      requester: {
        ...(request.requester || {}),
        ...contactProfile,
      },
    };
  }

  return request;
}

async function getRequestById(requestId) {
  const { data, error } = await supabase
    .from('donation_requests')
    .select(REQUEST_FIELDS)
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Solicitacao nao encontrada.');
  }

  return data;
}

async function ensureCurrentUserIsDonor(requestId) {
  const userId = await getAuthenticatedUserId();
  const request = await getRequestById(requestId);

  if (request.donor_id !== userId) {
    throw new Error('Voce nao tem permissao para alterar esta solicitacao.');
  }

  return {
    request,
    userId,
  };
}

export async function getRequestForItemByCurrentUser(itemId) {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('donation_requests')
    .select(REQUEST_FIELDS)
    .eq('item_id', itemId)
    .eq('requester_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getRequestsForMyItems() {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('donation_requests')
    .select(REQUEST_FIELDS)
    .eq('donor_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getReceivedRequests() {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('donation_requests')
    .select(REQUEST_FIELDS)
    .eq('donor_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return enrichRequests(data || []);
}

export async function getPendingReceivedRequestCount() {
  const userId = await getAuthenticatedUserId();

  const { count, error } = await supabase
    .from('donation_requests')
    .select('id', { count: 'exact', head: true })
    .eq('donor_id', userId)
    .eq('status', 'pending');

  if (error) {
    throw error;
  }

  return count || 0;
}

export async function getSentRequests() {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from('donation_requests')
    .select(REQUEST_FIELDS)
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return enrichRequests(data || []);
}

export async function getDonationRequestDetails(requestId) {
  const userId = await getAuthenticatedUserId();
  const request = await getRequestById(requestId);

  if (request.donor_id !== userId && request.requester_id !== userId) {
    throw new Error('Voce nao tem permissao para ver esta solicitacao.');
  }

  const [enrichedRequest] = await enrichRequests([request]);

  if (enrichedRequest.status !== 'accepted') {
    return enrichedRequest;
  }

  const contactProfile = await getAcceptedContactProfile(requestId);

  return attachContactProfile(enrichedRequest, contactProfile);
}

export async function acceptDonationRequest(requestId, itemId) {
  const { request, userId } = await ensureCurrentUserIsDonor(requestId);

  if (request.item_id !== itemId) {
    throw new Error('Dados da solicitacao inconsistentes. Atualize a tela e tente novamente.');
  }

  if (request.status !== 'pending') {
    throw new Error('Esta solicitacao nao esta mais pendente.');
  }

  const { error: itemError } = await supabase
    .from('items')
    .update({ status: 'reserved' })
    .eq('id', itemId)
    .eq('user_id', userId);

  if (itemError) {
    throw itemError;
  }

  const { data, error } = await supabase
    .from('donation_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .eq('donor_id', userId)
    .eq('status', 'pending')
    .select(REQUEST_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Solicitacao nao foi aceita. Atualize a tela e tente novamente.');
  }

  const { error: rejectOthersError } = await supabase
    .from('donation_requests')
    .update({ status: 'rejected' })
    .eq('item_id', itemId)
    .eq('donor_id', userId)
    .eq('status', 'pending')
    .neq('id', requestId);

  if (rejectOthersError) {
    throw rejectOthersError;
  }

  const [enrichedRequest] = await enrichRequests([data]);

  const contactProfile = await getAcceptedContactProfile(requestId);

  return attachContactProfile(enrichedRequest, contactProfile);
}

export async function rejectDonationRequest(requestId) {
  const { request, userId } = await ensureCurrentUserIsDonor(requestId);

  if (request.status !== 'pending') {
    throw new Error('Esta solicitacao nao esta mais pendente.');
  }

  const { data, error } = await supabase
    .from('donation_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)
    .eq('donor_id', userId)
    .eq('status', 'pending')
    .select(REQUEST_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Solicitacao nao foi recusada. Atualize a tela e tente novamente.');
  }

  const [enrichedRequest] = await enrichRequests([data]);

  return enrichedRequest;
}

export async function completeDonationRequest(requestId, itemId) {
  const { request, userId } = await ensureCurrentUserIsDonor(requestId);

  if (request.item_id !== itemId) {
    throw new Error('Dados da solicitacao inconsistentes. Atualize a tela e tente novamente.');
  }

  if (request.status !== 'accepted') {
    throw new Error('Apenas solicitacoes aceitas podem ser concluidas.');
  }

  const { data: item, error: itemReadError } = await supabase
    .from('items')
    .select('id, user_id, status')
    .eq('id', itemId)
    .maybeSingle();

  if (itemReadError) {
    throw itemReadError;
  }

  if (!item) {
    throw new Error('Doacao nao encontrada.');
  }

  if (item.user_id !== userId) {
    throw new Error('Voce nao tem permissao para concluir esta doacao.');
  }

  if (item.status !== 'reserved') {
    throw new Error('Esta doacao precisa estar reservada para ser concluida.');
  }

  const { error: itemError } = await supabase
    .from('items')
    .update({ status: 'completed' })
    .eq('id', itemId)
    .eq('user_id', userId)
    .eq('status', 'reserved');

  if (itemError) {
    throw itemError;
  }

  const { data, error } = await supabase
    .from('donation_requests')
    .update({ status: 'completed' })
    .eq('id', requestId)
    .eq('donor_id', userId)
    .eq('status', 'accepted')
    .select(REQUEST_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Solicitacao nao foi concluida. Atualize a tela e tente novamente.');
  }

  const { error: rejectOthersError } = await supabase
    .from('donation_requests')
    .update({ status: 'rejected' })
    .eq('item_id', itemId)
    .eq('donor_id', userId)
    .eq('status', 'pending')
    .neq('id', requestId);

  if (rejectOthersError) {
    throw rejectOthersError;
  }

  const [enrichedRequest] = await enrichRequests([data]);

  return enrichedRequest;
}

export async function createDonationRequest(itemId, donorId, message = null) {
  const userId = await getAuthenticatedUserId();

  if (userId === donorId) {
    throw new Error('Voce nao pode demonstrar interesse no proprio item.');
  }

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id, user_id, status')
    .eq('id', itemId)
    .maybeSingle();

  if (itemError) {
    throw itemError;
  }

  if (!item) {
    throw new Error('Doacao nao encontrada.');
  }

  if (item.user_id !== donorId) {
    throw new Error('Dados da doacao inconsistentes. Atualize a tela e tente novamente.');
  }

  if (item.user_id === userId) {
    throw new Error('Voce nao pode demonstrar interesse no proprio item.');
  }

  if (item.status !== 'available') {
    throw new Error('Este item nao esta disponivel para novas solicitacoes.');
  }

  const existingRequest = await getRequestForItemByCurrentUser(itemId);

  if (existingRequest) {
    throw new Error('Voce ja demonstrou interesse neste item.');
  }

  const { data, error } = await supabase
    .from('donation_requests')
    .insert({
      item_id: itemId,
      donor_id: donorId,
      requester_id: userId,
      status: 'pending',
      message,
    })
    .select(REQUEST_FIELDS)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Voce ja demonstrou interesse neste item.');
    }

    throw error;
  }

  return data;
}
