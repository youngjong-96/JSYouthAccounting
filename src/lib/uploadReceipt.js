import { supabase } from './supabase';

const RECEIPT_UPLOAD_MAX_FILE_SIZE_MB = 1;
const RECEIPT_UPLOAD_MAX_FILE_SIZE_BYTES = RECEIPT_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;
const RECEIPT_UPLOAD_RECOMMENDED_SPLIT_COUNT = 10;
const RECEIPT_UPLOAD_MAX_COUNT = 15;
const RECEIPT_UPLOAD_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const RECEIPT_UPLOAD_ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

/**
 * 파일 이름에서 확장자를 소문자로 추출합니다.
 * @param {File | { name?: string } | null | undefined} file
 * @returns {string}
 */
function getReceiptFileExtension(file) {
  const fileName = String(file?.name || '');
  const parts = fileName.split('.');
  return parts.length > 1 ? String(parts.pop()).toLowerCase() : '';
}

/**
 * 영수증 첨부 파일의 형식이 허용 범위인지 확인합니다.
 * @param {File} file
 * @returns {boolean}
 */
function isReceiptUploadFileTypeAllowed(file) {
  const mimeType = String(file?.type || '').toLowerCase();

  if (mimeType) {
    return RECEIPT_UPLOAD_ALLOWED_MIME_TYPES.has(mimeType);
  }

  return RECEIPT_UPLOAD_ALLOWED_EXTENSIONS.has(getReceiptFileExtension(file));
}

/**
 * 영수증 첨부 파일 1건의 유효성을 검사하고 오류 문구를 반환합니다.
 * @param {File} file
 * @returns {string}
 */
export function getReceiptUploadValidationError(file) {
  if (!isReceiptUploadFileTypeAllowed(file)) {
    return '지원하지 않는 파일 형식입니다. JPG, PNG, WEBP, GIF 이미지만 업로드해주세요.';
  }

  if (Number(file?.size || 0) > RECEIPT_UPLOAD_MAX_FILE_SIZE_BYTES) {
    return `파일당 최대 ${RECEIPT_UPLOAD_MAX_FILE_SIZE_MB}MB까지만 업로드할 수 있습니다.`;
  }

  return '';
}

/**
 * Supabase Storage 업로드 오류를 사용자에게 이해하기 쉬운 문구로 변환합니다.
 * @param {string | undefined} message
 * @returns {string}
 */
function getReadableReceiptUploadErrorMessage(message) {
  const normalizedMessage = String(message || '').toLowerCase();

  if (
    normalizedMessage.includes('maximum allowed size')
    || normalizedMessage.includes('file too large')
    || normalizedMessage.includes('payload too large')
    || normalizedMessage.includes('entity too large')
  ) {
    return `파일당 최대 ${RECEIPT_UPLOAD_MAX_FILE_SIZE_MB}MB까지만 업로드할 수 있습니다. 이미지 용량을 줄인 뒤 다시 시도해주세요.`;
  }

  if (
    normalizedMessage.includes('mime type')
    || normalizedMessage.includes('content type')
    || normalizedMessage.includes('invalid file type')
  ) {
    return '지원하지 않는 파일 형식입니다. JPG, PNG, WEBP, GIF 이미지만 업로드해주세요.';
  }

  return `영수증 업로드 실패: ${message || '알 수 없는 오류가 발생했습니다.'}`;
}

/**
 * Supabase Storage에 영수증 이미지를 업로드하고 public URL을 반환
 * @param {File} file - 업로드할 이미지 파일
 * @param {string} reportId - 지출결의서 ID
 * @returns {Promise<{url: string, fileName: string}>}
 */
export async function uploadReceipt(file, reportId) {
  const ext = file.name.split('.').pop();
  const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const path = `${reportId}/${safeName}`;

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(getReadableReceiptUploadErrorMessage(error.message));
  }

  const { data: urlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    fileName: file.name,
  };
}

/**
 * 현재 앱에서 허용하는 영수증 파일당 최대 용량(MB)을 반환합니다.
 * @returns {number}
 */
export function getReceiptUploadMaxFileSizeMb() {
  return RECEIPT_UPLOAD_MAX_FILE_SIZE_MB;
}

/**
 * 현재 앱에서 권장하는 지출결의서 분리 기준 영수증 개수를 반환합니다.
 * @returns {number}
 */
export function getReceiptUploadRecommendedSplitCount() {
  return RECEIPT_UPLOAD_RECOMMENDED_SPLIT_COUNT;
}

/**
 * 현재 앱에서 허용하는 영수증 최대 첨부 개수를 반환합니다.
 * @returns {number}
 */
export function getReceiptUploadMaxCount() {
  return RECEIPT_UPLOAD_MAX_COUNT;
}

/**
 * Supabase Storage에서 영수증 이미지를 삭제
 * @param {string} imageUrl - 삭제할 이미지의 public URL
 */
export async function deleteReceipt(imageUrl) {
  // URL에서 path 추출 (receipts/ 이후 부분)
  const urlObj = new URL(imageUrl);
  const pathParts = urlObj.pathname.split('/storage/v1/object/public/receipts/');
  if (pathParts.length < 2) return;

  const filePath = decodeURIComponent(pathParts[1]);
  const { error } = await supabase.storage
    .from('receipts')
    .remove([filePath]);

  if (error) {
    console.error('영수증 삭제 실패:', error.message);
  }
}
