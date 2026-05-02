import { supabase } from './supabase';

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
    throw new Error(`영수증 업로드 실패: ${error.message}`);
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
