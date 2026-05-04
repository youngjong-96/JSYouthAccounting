import { supabase } from './supabase';

/**
 * 현재 로그인한 사용자를 확인합니다.
 * @param {{ required?: boolean }} options
 * @returns {Promise<import('@supabase/supabase-js').User | null>}
 */
async function getCurrentUser(options = {}) {
  const { required = true } = options;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && required) {
    throw new Error('로그인이 필요합니다.');
  }

  return user;
}

/**
 * 게시글 입력값을 저장 가능한 형태로 정리하고 필수값을 검증합니다.
 * @param {{ title?: string, content?: string }} postData
 * @returns {{ title: string, content: string }}
 */
function prepareBoardPayload(postData = {}) {
  const title = postData.title?.trim() || '';
  const content = postData.content?.trim() || '';

  if (!title) {
    throw new Error('제목을 입력해주세요.');
  }

  if (!content) {
    throw new Error('내용을 입력해주세요.');
  }

  return {
    title,
    content,
  };
}

/**
 * 게시글 목록에 작성자 이름을 연결해 화면에서 바로 사용할 수 있게 정리합니다.
 * @param {Array<object>} posts
 * @returns {Promise<Array<object>>}
 */
async function attachAuthorNamesToPosts(posts = []) {
  if (posts.length === 0) {
    return [];
  }

  const userIds = [...new Set(posts.map((post) => post.user_id).filter(Boolean))];
  if (userIds.length === 0) {
    return posts.map((post) => ({ ...post, author_name: '' }));
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', userIds);

  if (error) {
    throw new Error(`작성자 조회 실패: ${error.message}`);
  }

  const profileNameMap = new Map(
    (profiles || []).map((profile) => [profile.id, profile.name || '']),
  );

  return posts.map((post) => ({
    ...post,
    author_name: profileNameMap.get(post.user_id) || '',
  }));
}

/**
 * 단건 게시글에도 작성자 이름을 연결해 상세 화면과 수정 흐름에서 재사용합니다.
 * @param {object | null} post
 * @returns {Promise<object | null>}
 */
async function attachAuthorNameToPost(post) {
  if (!post) {
    return null;
  }

  const [resolvedPost] = await attachAuthorNamesToPosts([post]);
  return resolvedPost || post;
}

/**
 * 자유게시판 게시글 목록을 최신순으로 조회합니다.
 * @returns {Promise<Array<object>>}
 */
export async function getBoardPosts() {
  const { data, error } = await supabase
    .from('free_board_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`게시글 목록 조회 실패: ${error.message}`);
  }

  return attachAuthorNamesToPosts(data || []);
}

/**
 * 새 자유게시판 게시글을 작성합니다.
 * @param {{ title?: string, content?: string }} postData
 * @returns {Promise<object>}
 */
export async function createBoardPost(postData) {
  const user = await getCurrentUser();
  const payload = prepareBoardPayload(postData);

  const { data, error } = await supabase
    .from('free_board_posts')
    .insert({
      user_id: user.id,
      ...payload,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`게시글 등록 실패: ${error.message}`);
  }

  return attachAuthorNameToPost(data);
}

/**
 * 본인이 작성한 자유게시판 게시글을 수정합니다.
 * @param {string} postId
 * @param {{ title?: string, content?: string }} postData
 * @param {{ currentUserId?: string | null }} options
 * @returns {Promise<object>}
 */
export async function updateBoardPost(postId, postData, options = {}) {
  const { currentUserId = null } = options;
  const user = currentUserId ? { id: currentUserId } : await getCurrentUser();
  const payload = prepareBoardPayload(postData);

  const { data: currentPost, error: currentError } = await supabase
    .from('free_board_posts')
    .select('id, user_id')
    .eq('id', postId)
    .single();

  if (currentError) {
    throw new Error(`게시글 조회 실패: ${currentError.message}`);
  }

  if (currentPost.user_id !== user.id) {
    throw new Error('본인이 작성한 게시글만 수정할 수 있습니다.');
  }

  const { data, error } = await supabase
    .from('free_board_posts')
    .update(payload)
    .eq('id', postId)
    .select()
    .single();

  if (error) {
    throw new Error(`게시글 수정 실패: ${error.message}`);
  }

  return attachAuthorNameToPost(data);
}

/**
 * 본인 게시글 또는 마스터 권한으로 자유게시판 게시글을 삭제합니다.
 * @param {string} postId
 * @param {{ currentUserId?: string | null, currentUserRole?: string | null }} options
 * @returns {Promise<void>}
 */
export async function deleteBoardPost(postId, options = {}) {
  const { currentUserId = null, currentUserRole = null } = options;
  const user = currentUserId ? { id: currentUserId } : await getCurrentUser();

  const { data: currentPost, error: currentError } = await supabase
    .from('free_board_posts')
    .select('id, user_id')
    .eq('id', postId)
    .single();

  if (currentError) {
    throw new Error(`게시글 조회 실패: ${currentError.message}`);
  }

  const isOwnPost = currentPost.user_id === user.id;
  const canDelete = isOwnPost || currentUserRole === 'master';

  if (!canDelete) {
    throw new Error('본인 게시글만 삭제할 수 있습니다.');
  }

  const { error } = await supabase
    .from('free_board_posts')
    .delete()
    .eq('id', postId);

  if (error) {
    throw new Error(`게시글 삭제 실패: ${error.message}`);
  }
}
