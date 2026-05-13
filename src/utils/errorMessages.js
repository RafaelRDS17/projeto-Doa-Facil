const SAFE_MESSAGES = new Set([
  'Apenas solicitacoes aceitas podem ser concluidas.',
  'Doacao nao encontrada.',
  'Este item nao esta disponivel para novas solicitacoes.',
  'Este telefone ja esta cadastrado.',
  'Esta doacao precisa estar reservada para ser concluida.',
  'Esta solicitacao nao esta mais pendente.',
  'Solicitacao nao encontrada.',
  'Sua sessao expirou. Faca login novamente.',
  'Voce ja demonstrou interesse neste item.',
  'Voce nao pode demonstrar interesse no proprio item.',
  'Voce nao tem permissao para alterar esta solicitacao.',
  'Voce nao tem permissao para apagar esta doacao.',
  'Voce nao tem permissao para concluir esta doacao.',
  'Voce nao tem permissao para editar esta doacao.',
  'Voce nao tem permissao para ver esta solicitacao.',
]);

export function getSafeErrorMessage(error, fallbackMessage) {
  const message = typeof error?.message === 'string' ? error.message : '';

  if (!message) {
    return fallbackMessage;
  }

  if (SAFE_MESSAGES.has(message)) {
    return message;
  }

  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'Email ou senha invalidos.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de fazer login.';
  }

  if (normalizedMessage.includes('user already registered')) {
    return 'Este e-mail ja esta cadastrado.';
  }

  if (normalizedMessage.includes('password')) {
    return 'Verifique se a senha atende aos requisitos de seguranca.';
  }

  if (normalizedMessage.includes('network') || normalizedMessage.includes('fetch')) {
    return 'Falha de conexao. Verifique sua internet e tente novamente.';
  }

  return fallbackMessage;
}
