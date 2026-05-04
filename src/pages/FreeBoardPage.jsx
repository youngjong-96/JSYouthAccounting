import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  createBoardPost,
  deleteBoardPost,
  getBoardPosts,
  updateBoardPost,
} from '../lib/freeBoardService';
import { useAuth } from '../context/AuthContext';

/* 게시글 제목 입력 공통 스타일입니다. */
const inputCls = 'w-full px-3 py-2.5 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-300 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all text-[16px]';

/* 게시글 본문 입력 공통 스타일입니다. */
const textareaCls = 'w-full min-h-[220px] px-3 py-3 bg-white border-2 border-mist-200 rounded-xl text-navy-500 placeholder-mist-300 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-all text-[15px] resize-y leading-relaxed';

/**
 * 새 게시글 폼의 기본값을 반환합니다.
 * @returns {{ title: string, content: string }}
 */
function emptyBoardForm() {
  return {
    title: '',
    content: '',
  };
}

/**
 * 날짜 문자열을 목록용 형식으로 변환합니다.
 * @param {string | null | undefined} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) {
    return '-';
  }

  const date = new Date(dateStr);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
}

/**
 * 날짜 문자열을 상세 모달용 시각 포함 형식으로 변환합니다.
 * @param {string | null | undefined} dateStr
 * @returns {string}
 */
function formatDateTime(dateStr) {
  if (!dateStr) {
    return '-';
  }

  const date = new Date(dateStr);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()} ${hours}:${minutes}`;
}

/**
 * 게시글에서 표시용 작성자 이름을 추출합니다.
 * @param {object | null | undefined} post
 * @returns {string}
 */
function getAuthorLabel(post) {
  return post?.author_name || '작성자 미상';
}

/**
 * 현재 사용자가 게시글 수정 권한이 있는지 확인합니다.
 * @param {object | null | undefined} post
 * @param {string | undefined} userId
 * @returns {boolean}
 */
function canEditBoardPost(post, userId) {
  return post?.user_id === userId;
}

/**
 * 현재 사용자가 게시글 삭제 권한이 있는지 확인합니다.
 * 본인 글은 누구나 삭제할 수 있고, 마스터는 모든 글을 삭제할 수 있습니다.
 * @param {object | null | undefined} post
 * @param {string | undefined} userId
 * @param {string | undefined} role
 * @returns {boolean}
 */
function canDeleteBoardPost(post, userId, role) {
  return post?.user_id === userId || role === 'master';
}

/**
 * 자유게시판 목록과 게시글 CRUD 모달을 함께 제공하는 화면입니다.
 * @returns {JSX.Element}
 */
const FreeBoardPage = () => {
  const { user, role } = useAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editingPost, setEditingPost] = useState(null);
  const [form, setForm] = useState(emptyBoardForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  /**
   * 성공 메시지를 잠깐 표시한 뒤 자동으로 닫습니다.
   * @param {string} message
   * @returns {void}
   */
  const showSuccessToast = (message) => {
    setSuccessMsg(message);
    window.setTimeout(() => {
      setSuccessMsg('');
    }, 1800);
  };

  /**
   * 게시글 목록을 최신순으로 다시 불러오고, 열려 있는 상세 정보도 최신 데이터로 동기화합니다.
   * @returns {Promise<void>}
   */
  const fetchPosts = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const postList = await getBoardPosts();
      setPosts(postList || []);
      setSelectedPost((prevSelectedPost) => {
        if (!prevSelectedPost) {
          return null;
        }

        return postList.find((post) => post.id === prevSelectedPost.id) || null;
      });
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  /**
   * 새 글 작성 모달을 초기 상태로 엽니다.
   * @returns {void}
   */
  const openCreateEditor = () => {
    setSelectedPost(null);
    setEditorMode('create');
    setEditingPost(null);
    setForm(emptyBoardForm());
    setShowEditor(true);
  };

  /**
   * 선택한 게시글 내용을 수정 모달에 채워 엽니다.
   * @param {object} post
   * @returns {void}
   */
  const openEditEditor = (post) => {
    setSelectedPost(null);
    setEditorMode('edit');
    setEditingPost(post);
    setForm({
      title: post.title || '',
      content: post.content || '',
    });
    setShowEditor(true);
  };

  /**
   * 게시글 입력 모달을 닫고 편집 상태를 초기화합니다.
   * @returns {void}
   */
  const closeEditor = () => {
    if (saving) {
      return;
    }

    setShowEditor(false);
    setEditingPost(null);
    setForm(emptyBoardForm());
  };

  /**
   * 게시글 상세 모달을 엽니다.
   * @param {object} post
   * @returns {void}
   */
  const openDetail = (post) => {
    setSelectedPost(post);
  };

  /**
   * 게시글 상세 모달을 닫습니다.
   * @returns {void}
   */
  const closeDetail = () => {
    setSelectedPost(null);
  };

  /**
   * 게시글 입력값을 필드 단위로 갱신합니다.
   * @param {'title' | 'content'} field
   * @param {string} value
   * @returns {void}
   */
  const handleFormChange = (field, value) => {
    setForm((prevForm) => ({
      ...prevForm,
      [field]: value,
    }));
  };

  /**
   * 새 글 작성 또는 기존 글 수정을 저장합니다.
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    setSaving(true);

    try {
      const savedPost = editorMode === 'edit' && editingPost
        ? await updateBoardPost(editingPost.id, form, { currentUserId: user?.id })
        : await createBoardPost(form);

      setShowEditor(false);
      setEditingPost(null);
      setForm(emptyBoardForm());
      setSelectedPost((prevSelectedPost) => (
        prevSelectedPost?.id === savedPost.id ? savedPost : prevSelectedPost
      ));
      showSuccessToast(editorMode === 'edit' ? '게시글이 수정되었습니다.' : '게시글이 등록되었습니다.');
      await fetchPosts();
    } catch (saveError) {
      alert(`게시글 저장에 실패했습니다: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  /**
   * 삭제 확인 대상을 지정해 확인 모달을 엽니다.
   * @param {object} post
   * @returns {void}
   */
  const openDeleteConfirm = (post) => {
    setDeleteTarget(post);
  };

  /**
   * 선택한 게시글을 실제로 삭제한 뒤 목록과 모달 상태를 정리합니다.
   * @returns {Promise<void>}
   */
  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      await deleteBoardPost(deleteTarget.id, {
        currentUserId: user?.id,
        currentUserRole: role,
      });

      setDeleteTarget(null);
      setShowEditor(false);
      setEditingPost(null);
      setForm(emptyBoardForm());
      setSelectedPost((prevSelectedPost) => (
        prevSelectedPost?.id === deleteTarget.id ? null : prevSelectedPost
      ));
      showSuccessToast('게시글이 삭제되었습니다.');
      await fetchPosts();
    } catch (deleteError) {
      alert(`게시글 삭제에 실패했습니다: ${deleteError.message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-9 h-9 text-navy-400 animate-spin mb-3" />
        <p className="text-sm text-mist-500">게시글을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center animate-fadeIn">
        <AlertCircle className="w-9 h-9 text-red-400 mx-auto mb-3" />
        <p className="text-red-600 font-medium text-sm mb-4">{error}</p>
        <button
          onClick={fetchPosts}
          className="px-5 py-2.5 bg-navy-500 text-white rounded-xl text-sm font-medium hover:bg-navy-600 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slideUp pb-8">
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl animate-fadeIn text-sm font-medium">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-navy-50 rounded-xl">
            <MessageSquare className="w-5 h-5 text-navy-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy-500">자유게시판</h2>
            <p className="text-xs text-mist-500">공지와 건의사항을 자유롭게 남겨보세요. 총 {posts.length}건</p>
          </div>
        </div>
        <button
          onClick={openCreateEditor}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gold-400 hover:bg-gold-500 text-navy-700 text-xs font-semibold rounded-xl transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          글쓰기
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-mist-200 p-14 text-center">
          <div className="w-16 h-16 bg-cream-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-mist-300" />
          </div>
          <h3 className="text-sm font-bold text-navy-500 mb-1.5">아직 게시글이 없습니다</h3>
          <p className="text-xs text-mist-500 mb-5">첫 번째 공지나 건의사항을 남겨보세요.</p>
          <button
            onClick={openCreateEditor}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy-500 hover:bg-navy-600 text-white text-sm font-medium rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            게시글 작성하기
          </button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-2xl border border-mist-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-100 border-b border-mist-200">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-mist-500">No.</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-mist-500">제목</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-mist-500">작성자</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-mist-500">작성일</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold text-mist-500">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {posts.map((post, index) => {
                  const canEdit = canEditBoardPost(post, user?.id);
                  const canDelete = canDeleteBoardPost(post, user?.id, role);

                  return (
                    <tr key={post.id} className="hover:bg-cream-100/60 transition-colors group">
                      <td className="px-4 py-3.5 text-xs text-mist-400">{posts.length - index}</td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => openDetail(post)}
                          className="text-left text-sm font-semibold text-navy-500 hover:text-gold-600 transition-colors"
                        >
                          {post.title}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-mist-500">{getAuthorLabel(post)}</td>
                      <td className="px-4 py-3.5 text-sm text-mist-500">{formatDate(post.created_at)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openDetail(post)}
                            className="p-2 text-navy-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
                            title="상세 보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => openEditEditor(post)}
                              className="p-2 text-gold-500 hover:text-gold-700 hover:bg-gold-50 rounded-lg transition-colors"
                              title="수정"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => openDeleteConfirm(post)}
                              className="p-2 text-mist-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {posts.map((post, index) => {
              const canEdit = canEditBoardPost(post, user?.id);
              const canDelete = canDeleteBoardPost(post, user?.id, role);

              return (
                <div key={post.id} className="bg-white rounded-2xl border border-mist-200 overflow-hidden">
                  <button
                    onClick={() => openDetail(post)}
                    className="w-full p-4 text-left active:bg-cream-100 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-mist-400">#{posts.length - index}</span>
                      <span className="text-[11px] font-medium text-mist-400">{formatDate(post.created_at)}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-navy-500 leading-relaxed">{post.title}</h3>
                    <p className="mt-2 text-xs text-mist-500">{getAuthorLabel(post)}</p>
                  </button>

                  <div className="px-4 py-2.5 border-t border-mist-100 flex items-center justify-end gap-3 bg-cream-100/40">
                    <button
                      onClick={() => openDetail(post)}
                      className="text-xs text-navy-400 font-medium flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      보기
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => openEditEditor(post)}
                        className="text-xs text-gold-600 font-semibold flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        수정
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => openDeleteConfirm(post)}
                        className="text-xs text-red-500 font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm"
            onClick={closeDetail}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-slideUp overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-mist-200">
              <div>
                <p className="text-xs text-gold-500 font-semibold uppercase tracking-wider">자유게시판</p>
                <h3 className="mt-1 text-lg font-bold text-navy-500 break-words">{selectedPost.title}</h3>
                <p className="mt-2 text-xs text-mist-400">
                  {getAuthorLabel(selectedPost)} · {formatDateTime(selectedPost.created_at)}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="p-2 text-mist-400 hover:text-navy-500 hover:bg-cream-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-5 max-h-[60vh] overflow-y-auto">
              <div className="whitespace-pre-wrap text-sm leading-7 text-mist-600 break-words">
                {selectedPost.content}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-mist-100 bg-cream-100/40">
              <div className="flex items-center gap-2">
                {canEditBoardPost(selectedPost, user?.id) && (
                  <button
                    onClick={() => openEditEditor(selectedPost)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-gold-400 hover:bg-gold-500 text-navy-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    수정
                  </button>
                )}
                {canDeleteBoardPost(selectedPost, user?.id, role) && (
                  <button
                    onClick={() => openDeleteConfirm(selectedPost)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold rounded-xl transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    삭제
                  </button>
                )}
              </div>
              <button
                onClick={closeDetail}
                className="px-3 py-2 bg-white border border-mist-200 text-navy-500 text-xs font-semibold rounded-xl hover:bg-cream-100 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm"
            onClick={closeEditor}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-slideUp overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-mist-200">
              <div>
                <p className="text-xs text-gold-500 font-semibold uppercase tracking-wider">자유게시판</p>
                <h3 className="mt-1 text-base font-bold text-navy-500">
                  {editorMode === 'edit' ? '게시글 수정' : '새 게시글 작성'}
                </h3>
              </div>
              <button
                onClick={closeEditor}
                className="p-2 text-mist-400 hover:text-navy-500 hover:bg-cream-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-navy-400 mb-1.5 uppercase tracking-wider">제목</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => handleFormChange('title', event.target.value)}
                  placeholder="게시글 제목을 입력해주세요."
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-400 mb-1.5 uppercase tracking-wider">내용</label>
                <textarea
                  value={form.content}
                  onChange={(event) => handleFormChange('content', event.target.value)}
                  placeholder="공지사항이나 건의사항 내용을 입력해주세요."
                  className={textareaCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 px-5 py-4 border-t border-mist-100 bg-cream-100/40">
              <button
                onClick={closeEditor}
                disabled={saving}
                className="py-3 bg-white border border-mist-200 text-navy-500 font-semibold rounded-xl hover:bg-cream-100 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="py-3 bg-navy-500 hover:bg-navy-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editorMode === 'edit' ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editorMode === 'edit' ? '수정 저장' : '게시글 등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm"
            onClick={() => {
              if (!deleting) {
                setDeleteTarget(null);
              }
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-slideUp">
            <h3 className="text-base font-bold text-navy-500 mb-2">게시글 삭제</h3>
            <p className="text-sm text-mist-500 mb-6 leading-relaxed break-words">
              정말로 <span className="font-semibold text-navy-500">{deleteTarget.title}</span> 게시글을 삭제하시겠습니까?
              <br />
              삭제한 게시글은 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-cream-100 text-navy-500 font-medium rounded-xl hover:bg-mist-200 transition-colors text-sm disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreeBoardPage;
