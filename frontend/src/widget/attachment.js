export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ACCEPT_ATTACHMENTS = '.jpg,.jpeg,.pdf,.xls,.xlsx,.doc,.docx';
export function validateAttachment(file) {
  if (!/\.(jpe?g|pdf|xlsx?|docx?)$/i.test(file.name)) return 'Поддерживаются JPEG, PDF, Excel (.xls, .xlsx) и Word (.doc, .docx).';
  if (file.size === 0) return 'Файл пуст. Выберите другой файл.';
  if (file.size > MAX_ATTACHMENT_BYTES) return 'Максимальный размер — 10 МБ.';
  return '';
}
