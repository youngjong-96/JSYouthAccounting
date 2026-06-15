import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  FilePlus,
  FileText,
  Loader2,
  Pencil,
  Receipt,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  deleteExpenseReport,
  getExpenseReport,
  getExpenseReports,
  updateExpenseReportCheck,
} from '../lib/expenseReportService';
import {
  clearExpenseReportCacheInvalidation,
  readExpenseReportCacheInvalidation,
} from '../lib/expenseReportCacheInvalidation';
import {
  completeExpenseReportPerformanceMeasurement,
  startExpenseReportPerformanceMeasurement,
} from '../lib/expenseReportPerformance';
import ExpenseReportDetailModal from '../components/ExpenseReportDetailModal';
import { useAuth } from '../context/AuthContext';

/* 지출결의서 상태별 표시 문구와 색상 조합을 정의합니다. */
const statusMap = {
  draft: { label: '임시저장', cls: 'bg-gold-50 text-gold-600 border-gold-200' },
  submitted: { label: '제출완료', cls: 'bg-green-50 text-green-700 border-green-200' },
  approved: { label: '확인완료', cls: 'bg-navy-50 text-navy-600 border-navy-200' },
  unknown: { label: '상태 확인 필요', cls: 'bg-red-50 text-red-600 border-red-200' },
};

/* 처리 체크 항목 목록을 정의합니다. */
const CHECK_FIELDS = [
  { field: 'director_confirmed', label: '부장님 확인' },
  { field: 'payment_completed', label: '지급 완료' },
  { field: 'print_completed', label: '출력 완료' },
];

/* PC와 모바일 모두 한 번에 5건씩만 표시합니다. */
const REPORTS_PER_PAGE = 5;

/* 최근에 본 목록 페이지를 잠시 재사용할 수 있도록 캐시 유지 시간을 정의합니다. */
const REPORT_PAGE_CACHE_TTL_MS = 60 * 1000;

/* 최근에 본 상세 문서를 잠시 재사용할 수 있도록 캐시 유지 시간을 정의합니다. */
const REPORT_DETAIL_CACHE_TTL_MS = 60 * 1000;

/* 비어 있는 목록 페이지의 기본 구조를 정의합니다. */
const EMPTY_REPORT_PAGE = {
  items: [],
  page: 1,
  limit: REPORTS_PER_PAGE,
  total_count: 0,
  total_pages: 1,
  has_next: false,
  has_prev: false,
  scope_total_count: 0,
};

/* 사용자별 목록 페이지 캐시를 세션 메모리에 유지합니다. */
const expenseReportPageCache = new Map();

/* 사용자별 상세 문서 캐시를 세션 메모리에 유지합니다. */
const expenseReportDetailCache = new Map();

/* 다음 페이지 선로딩 요청 중복을 막기 위해 진행 중인 요청을 기록합니다. */
const expenseReportPagePrefetchMap = new Map();

/**
 * 결의서 상태값을 비교 가능한 문자열로 정규화합니다.
 * @param {string | null | undefined} status
 * @returns {string}
 */
function normalizeReportStatus(status) {
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

/**
 * 현재 문서가 수정 가능한 임시저장 상태인지 확인합니다.
 * @param {string | null | undefined} status
 * @returns {boolean}
 */
function isDraftReportStatus(status) {
  return normalizeReportStatus(status) === 'draft';
}

/**
 * 결의서 상태 배지를 렌더링합니다.
 * @param {{ status: string | null | undefined }} props
 * @returns {JSX.Element}
 */
function StatusBadge({ status }) {
  const currentStatus = statusMap[normalizeReportStatus(status)] || statusMap.unknown;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${currentStatus.cls}`}>
      {currentStatus.label}
    </span>
  );
}

/**
 * 날짜 문자열을 목록 표시 형식으로 변환합니다.
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
 * 지출결의서 데이터에서 작성자명을 안전하게 추출합니다.
 * @param {object} report
 * @returns {string}
 */
function getReportAuthorName(report) {
  return report?.author_name || '작성자 미상';
}

/**
 * 현재 사용자가 임시저장 문서를 수정할 수 있는지 확인합니다.
 * @param {object} report
 * @param {string | undefined} userId
 * @returns {boolean}
 */
function canEditDraftReport(report, userId) {
  return isDraftReportStatus(report?.status) && report?.user_id === userId;
}

/**
 * 체크 항목 변경 전에 보여줄 확인 문구를 생성합니다.
 * @param {string} label
 * @param {boolean} nextValue
 * @returns {string}
 */
function getCheckConfirmMessage(label, nextValue) {
  return nextValue
    ? `${label} 체크박스를 누르시겠습니까?`
    : `${label} 체크박스를 해제하시겠습니까?`;
}

/**
 * 처리 체크 버튼을 렌더링합니다.
 * @param {{
 *   label: string,
 *   checked: boolean,
 *   checkedBy: string | null | undefined,
 *   canEdit: boolean,
 *   onToggle: (() => void) | undefined,
 *   updating: boolean
 * }} props
 * @returns {JSX.Element}
 */
function CheckItem({ label, checked, checkedBy, canEdit, onToggle, updating }) {
  const title = checked && checkedBy
    ? `${checkedBy}님이 확인`
    : canEdit
      ? '클릭하여 확인 상태를 변경합니다.'
      : '';

  return (
    <button
      onClick={canEdit ? onToggle : undefined}
      disabled={updating || !canEdit}
      title={title}
      className={`
        inline-flex items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-medium transition-all
        ${checked
          ? 'border-navy-500 bg-navy-500 text-white'
          : canEdit
            ? 'border-mist-200 text-mist-400 hover:border-gold-400 hover:text-gold-500'
            : 'cursor-default border-mist-100 bg-transparent text-mist-300'
        }
        ${updating ? 'cursor-wait opacity-50' : ''}
        ${!canEdit && !checked ? 'opacity-60' : ''}
      `}
    >
      {checked
        ? <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
        : <Circle className="h-3 w-3 flex-shrink-0" />
      }
      <span>{label}</span>
    </button>
  );
}

/**
 * 목록 필터의 초기 상태를 생성합니다.
 * @returns {{ director_confirmed: string, payment_completed: string, print_completed: string }}
 */
function createDefaultFilters() {
  return {
    director_confirmed: 'all',
    payment_completed: 'all',
    print_completed: 'all',
  };
}

/**
 * 사용자와 필터 조합별 목록 캐시 키를 생성합니다.
 * @param {{
 *   userId: string,
 *   page: number,
 *   limit: number,
 *   filters: {
 *     director_confirmed: string,
 *     payment_completed: string,
 *     print_completed: string
 *   }
 * }} options
 * @returns {string}
 */
function createExpenseReportPageCacheKey({
  userId,
  page,
  limit,
  filters,
}) {
  return [
    userId,
    page,
    limit,
    filters.director_confirmed,
    filters.payment_completed,
    filters.print_completed,
  ].join('::');
}

/**
 * 사용자별 상세 문서 캐시 키를 생성합니다.
 * @param {{ userId: string, reportId: string }} options
 * @returns {string}
 */
function createExpenseReportDetailCacheKey({ userId, reportId }) {
  return [userId, reportId].join('::');
}

/**
 * 목록 페이지 캐시 엔트리가 아직 즉시 재사용 가능한 상태인지 확인합니다.
 * @param {{ pageData: object, cachedAt: number } | null} cacheEntry
 * @returns {boolean}
 */
function isExpenseReportPageCacheFresh(cacheEntry) {
  if (!cacheEntry) {
    return false;
  }

  return (Date.now() - cacheEntry.cachedAt) < REPORT_PAGE_CACHE_TTL_MS;
}

/**
 * 상세 문서 캐시 엔트리가 아직 즉시 재사용 가능한 상태인지 확인합니다.
 * @param {{ reportData: object, cachedAt: number } | null} cacheEntry
 * @returns {boolean}
 */
function isExpenseReportDetailCacheFresh(cacheEntry) {
  if (!cacheEntry) {
    return false;
  }

  return (Date.now() - cacheEntry.cachedAt) < REPORT_DETAIL_CACHE_TTL_MS;
}

/**
 * 캐시에 저장된 원본 엔트리를 조회합니다.
 * @param {string} cacheKey
 * @returns {{ pageData: object, cachedAt: number } | null}
 */
function getCachedExpenseReportPageEntry(cacheKey) {
  return expenseReportPageCache.get(cacheKey) || null;
}

/**
 * 캐시에 저장된 상세 문서 원본 엔트리를 조회합니다.
 * @param {string} cacheKey
 * @returns {{ reportData: object, cachedAt: number } | null}
 */
function getCachedExpenseReportDetailEntry(cacheKey) {
  return expenseReportDetailCache.get(cacheKey) || null;
}

/**
 * 캐시에 저장된 목록 페이지를 안전하게 조회합니다.
 * @param {string} cacheKey
 * @returns {object | null}
 */
function getCachedExpenseReportPage(cacheKey) {
  const cacheEntry = getCachedExpenseReportPageEntry(cacheKey);

  return cacheEntry?.pageData || null;
}

/**
 * 캐시에 저장된 상세 문서를 안전하게 조회합니다.
 * @param {string} cacheKey
 * @returns {object | null}
 */
function getCachedExpenseReportDetail(cacheKey) {
  const cacheEntry = getCachedExpenseReportDetailEntry(cacheKey);

  return cacheEntry?.reportData || null;
}

/**
 * 목록 페이지 응답을 캐시에 저장합니다.
 * @param {string} cacheKey
 * @param {object} nextPage
 * @returns {void}
 */
function setCachedExpenseReportPage(cacheKey, nextPage) {
  expenseReportPageCache.set(cacheKey, {
    pageData: nextPage,
    cachedAt: Date.now(),
  });
}

/**
 * 상세 문서 응답을 캐시에 저장합니다.
 * @param {string} cacheKey
 * @param {object} nextReport
 * @returns {void}
 */
function setCachedExpenseReportDetail(cacheKey, nextReport) {
  expenseReportDetailCache.set(cacheKey, {
    reportData: nextReport,
    cachedAt: Date.now(),
  });
}

/**
 * 현재 사용자의 목록 캐시를 모두 비워 다음 조회가 최신 데이터를 읽도록 합니다.
 * @param {string | undefined} userId
 * @returns {void}
 */
function clearExpenseReportPageCacheForUser(userId) {
  if (!userId) {
    return;
  }

  const cacheKeyPrefix = `${userId}::`;

  Array.from(expenseReportPageCache.keys()).forEach((cacheKey) => {
    if (cacheKey.startsWith(cacheKeyPrefix)) {
      expenseReportPageCache.delete(cacheKey);
    }
  });

  Array.from(expenseReportPagePrefetchMap.keys()).forEach((cacheKey) => {
    if (cacheKey.startsWith(cacheKeyPrefix)) {
      expenseReportPagePrefetchMap.delete(cacheKey);
    }
  });
}

/**
 * 현재 사용자의 상세 캐시를 모두 비워 다음 상세 조회가 최신 데이터를 받도록 합니다.
 * @param {string | undefined} userId
 * @returns {void}
 */
function clearExpenseReportDetailCacheForUser(userId) {
  if (!userId) {
    return;
  }

  const cacheKeyPrefix = `${userId}::`;

  Array.from(expenseReportDetailCache.keys()).forEach((cacheKey) => {
    if (cacheKey.startsWith(cacheKeyPrefix)) {
      expenseReportDetailCache.delete(cacheKey);
    }
  });
}

/**
 * 특정 상세 문서 캐시만 비워 다음 조회에서 최신 데이터를 받도록 합니다.
 * @param {string | undefined} userId
 * @param {string} reportId
 * @returns {void}
 */
function clearExpenseReportDetailCacheForReport(userId, reportId) {
  if (!userId || !reportId) {
    return;
  }

  expenseReportDetailCache.delete(createExpenseReportDetailCacheKey({ userId, reportId }));
}

/**
 * 현재 페이지를 본 뒤 다음 페이지를 백그라운드에서 미리 불러옵니다.
 * @param {{
 *   userId: string,
 *   token: string | null | undefined,
 *   page: number,
 *   limit: number,
 *   filters: {
 *     director_confirmed: string,
 *     payment_completed: string,
 *     print_completed: string
 *   }
 * }} options
 * @returns {Promise<void>}
 */
async function prefetchExpenseReportPage(options) {
  const cacheKey = createExpenseReportPageCacheKey(options);

  if (expenseReportPageCache.has(cacheKey) || expenseReportPagePrefetchMap.has(cacheKey)) {
    return;
  }

  const prefetchPromise = getExpenseReports({
    token: options.token,
    page: options.page,
    limit: options.limit,
    filters: options.filters,
  })
    .then((nextPage) => {
      if (!nextPage) {
        return;
      }

      const resolvedPage = nextPage.page || options.page;
      const resolvedCacheKey = createExpenseReportPageCacheKey({
        ...options,
        page: resolvedPage,
      });

      setCachedExpenseReportPage(resolvedCacheKey, nextPage);
    })
    .catch(() => {
      /* 선로딩 실패는 현재 화면 흐름을 막지 않도록 조용히 무시합니다. */
    })
    .finally(() => {
      expenseReportPagePrefetchMap.delete(cacheKey);
    });

  expenseReportPagePrefetchMap.set(cacheKey, prefetchPromise);
  await prefetchPromise;
}

/**
 * 지출결의서 목록, 상세, 삭제, 임시저장 수정 진입 기능을 제공합니다.
 * @returns {JSX.Element}
 */
const ExpenseReport = () => {
  const navigate = useNavigate();
  const { user, token, canManageChecks } = useAuth();

  const [reportPage, setReportPage] = useState(EMPTY_REPORT_PAGE);
  const [loading, setLoading] = useState(true);
  const [pageTransitioning, setPageTransitioning] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [detailRefreshingId, setDetailRefreshingId] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [updatingCheck, setUpdatingCheck] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState(createDefaultFilters);
  const listRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const hasLoadedListRef = useRef(false);
  const previousUserIdRef = useRef(user?.id);

  const hasActiveFilter = Object.values(filters).some((value) => value !== 'all');
  const reports = reportPage.items || [];
  const showListTransitionState = pageTransitioning && !loading;
  const showListRefreshingState = backgroundRefreshing && !loading && !pageTransitioning;
  const isDetailLoading = Boolean(detailLoadingId);
  const isDetailRefreshing = Boolean(detailRefreshingId);

  /**
   * 지출결의서 목록을 서버 페이지 데이터 API로 조회합니다.
   * 캐시된 페이지가 있으면 먼저 보여주고 뒤에서 다시 검증합니다.
   * @returns {Promise<void>}
   */
  const fetchReports = useCallback(async () => {
    if (!user?.id) {
      setPageTransitioning(false);
      setBackgroundRefreshing(false);
      return;
    }

    setError(null);

    const requestPage = currentPage;
    const requestFilters = { ...filters };
    const cacheKey = createExpenseReportPageCacheKey({
      userId: user.id,
      page: requestPage,
      limit: REPORTS_PER_PAGE,
      filters: requestFilters,
    });
    const cachedEntry = getCachedExpenseReportPageEntry(cacheKey);
    const cachedPage = getCachedExpenseReportPage(cacheKey);
    const isFreshCachedPage = isExpenseReportPageCacheFresh(cachedEntry);
    const requestId = listRequestIdRef.current + 1;
    const listHasActiveFilter = Object.values(requestFilters).some((value) => value !== 'all');
    const listDisplayScenario = hasLoadedListRef.current || Boolean(cachedPage) ? 'revisit' : 'initial';
    let listDisplayMeasurement = null;
    let listRefreshMeasurement = null;

    listRequestIdRef.current = requestId;

    if (cachedPage) {
      listDisplayMeasurement = startExpenseReportPerformanceMeasurement({
        metric: 'list_display',
        meta: {
          scenario: listDisplayScenario,
          cacheState: isFreshCachedPage ? 'fresh' : 'stale',
          page: requestPage,
          hasActiveFilter: listHasActiveFilter,
        },
      });
      hasLoadedListRef.current = true;
      setReportPage(cachedPage);
      setLoading(false);
      setPageTransitioning(false);
      completeExpenseReportPerformanceMeasurement(listDisplayMeasurement, {
        meta: {
          totalCount: cachedPage.total_count || 0,
        },
      });
      listDisplayMeasurement = null;

      if (isFreshCachedPage) {
        setBackgroundRefreshing(false);
        return;
      }

      listRefreshMeasurement = startExpenseReportPerformanceMeasurement({
        metric: 'list_refresh',
        meta: {
          scenario: listDisplayScenario,
          cacheState: 'stale',
          page: requestPage,
          hasActiveFilter: listHasActiveFilter,
        },
      });
      setBackgroundRefreshing(true);
    } else if (hasLoadedListRef.current) {
      listDisplayMeasurement = startExpenseReportPerformanceMeasurement({
        metric: 'list_display',
        meta: {
          scenario: listDisplayScenario,
          cacheState: 'miss',
          page: requestPage,
          hasActiveFilter: listHasActiveFilter,
        },
      });
      setPageTransitioning(true);
      setBackgroundRefreshing(false);
    } else {
      listDisplayMeasurement = startExpenseReportPerformanceMeasurement({
        metric: 'list_display',
        meta: {
          scenario: listDisplayScenario,
          cacheState: 'miss',
          page: requestPage,
          hasActiveFilter: listHasActiveFilter,
        },
      });
      setLoading(true);
      setPageTransitioning(false);
      setBackgroundRefreshing(false);
    }

    try {
      const nextPage = await getExpenseReports({
        token,
        page: requestPage,
        limit: REPORTS_PER_PAGE,
        filters: requestFilters,
      });

      if (requestId !== listRequestIdRef.current) {
        completeExpenseReportPerformanceMeasurement(listDisplayMeasurement, {
          outcome: 'canceled',
          meta: {
            page: requestPage,
          },
        });
        completeExpenseReportPerformanceMeasurement(listRefreshMeasurement, {
          outcome: 'canceled',
          meta: {
            page: requestPage,
          },
        });
        return;
      }

      const normalizedPage = nextPage || EMPTY_REPORT_PAGE;
      const resolvedPage = normalizedPage.page || requestPage;
      const resolvedCacheKey = createExpenseReportPageCacheKey({
        userId: user.id,
        page: resolvedPage,
        limit: REPORTS_PER_PAGE,
        filters: requestFilters,
      });

      hasLoadedListRef.current = true;
      setCachedExpenseReportPage(cacheKey, normalizedPage);
      setCachedExpenseReportPage(resolvedCacheKey, normalizedPage);
      setReportPage(normalizedPage);
      setLoading(false);
      setBackgroundRefreshing(false);
      completeExpenseReportPerformanceMeasurement(listDisplayMeasurement, {
        meta: {
          totalCount: normalizedPage.total_count || 0,
          totalPages: normalizedPage.total_pages || 1,
        },
      });
      listDisplayMeasurement = null;
      completeExpenseReportPerformanceMeasurement(listRefreshMeasurement, {
        meta: {
          totalCount: normalizedPage.total_count || 0,
          totalPages: normalizedPage.total_pages || 1,
        },
      });
      listRefreshMeasurement = null;

      if (resolvedPage !== requestPage) {
        setCurrentPage(resolvedPage);
      }

      if (normalizedPage.has_next && resolvedPage < normalizedPage.total_pages) {
        void prefetchExpenseReportPage({
          userId: user.id,
          token,
          page: resolvedPage + 1,
          limit: REPORTS_PER_PAGE,
          filters: requestFilters,
        });
      }
    } catch (fetchError) {
      if (requestId !== listRequestIdRef.current) {
        completeExpenseReportPerformanceMeasurement(listDisplayMeasurement, {
          outcome: 'canceled',
          meta: {
            page: requestPage,
          },
        });
        completeExpenseReportPerformanceMeasurement(listRefreshMeasurement, {
          outcome: 'canceled',
          meta: {
            page: requestPage,
          },
        });
        return;
      }

      completeExpenseReportPerformanceMeasurement(listDisplayMeasurement, {
        outcome: 'failed',
        meta: {
          page: requestPage,
          errorMessage: fetchError.message,
        },
      });
      completeExpenseReportPerformanceMeasurement(listRefreshMeasurement, {
        outcome: 'failed',
        meta: {
          page: requestPage,
          errorMessage: fetchError.message,
        },
      });

      if (!cachedPage) {
        setError(fetchError.message);
      }
    } finally {
      if (requestId === listRequestIdRef.current) {
        setLoading(false);
        setPageTransitioning(false);
        setBackgroundRefreshing(false);
      }
    }
  }, [currentPage, filters, token, user?.id]);

  /**
   * 작성/수정/제출 후 복귀한 경우 세션에 남긴 무효화 신호를 읽어 관련 캐시를 먼저 정리합니다.
   * @returns {void}
   */
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const invalidationSignal = readExpenseReportCacheInvalidation();

    if (!invalidationSignal || invalidationSignal.userId !== user.id) {
      return;
    }

    clearExpenseReportPageCacheForUser(user.id);

    if (invalidationSignal.reportId) {
      clearExpenseReportDetailCacheForReport(user.id, invalidationSignal.reportId);
    }

    clearExpenseReportCacheInvalidation();
  }, [user?.id]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  /**
   * 로그인 사용자가 바뀌면 이전 사용자의 상세 캐시를 정리해 세션 간 데이터가 섞이지 않도록 합니다.
   * @returns {void}
   */
  useEffect(() => {
    const previousUserId = previousUserIdRef.current;

    if (previousUserId && previousUserId !== user?.id) {
      clearExpenseReportPageCacheForUser(previousUserId);
      clearExpenseReportDetailCacheForUser(previousUserId);
    }

    previousUserIdRef.current = user?.id;
  }, [user?.id]);

  /**
   * 선택한 결의서의 상세 모달을 엽니다.
   * @param {string} reportId
   * @returns {Promise<void>}
   */
  const handleView = async (reportId) => {
    const requestId = detailRequestIdRef.current + 1;
    const detailCacheKey = createExpenseReportDetailCacheKey({
      userId: user?.id || 'anonymous',
      reportId,
    });
    const cachedDetailEntry = getCachedExpenseReportDetailEntry(detailCacheKey);
    const cachedDetail = getCachedExpenseReportDetail(detailCacheKey);
    const isFreshCachedDetail = isExpenseReportDetailCacheFresh(cachedDetailEntry);
    const detailDisplayScenario = cachedDetail ? 'reopen' : 'first-open';
    let detailDisplayMeasurement = null;
    let detailRefreshMeasurement = null;

    detailRequestIdRef.current = requestId;
    setShowDetail(true);

    if (cachedDetail) {
      detailDisplayMeasurement = startExpenseReportPerformanceMeasurement({
        metric: 'detail_display',
        meta: {
          scenario: detailDisplayScenario,
          cacheState: isFreshCachedDetail ? 'fresh' : 'stale',
          reportId,
        },
      });
      setSelectedReport(cachedDetail);
      setDetailLoadingId(null);
      completeExpenseReportPerformanceMeasurement(detailDisplayMeasurement, {
        meta: {
          receiptCount: cachedDetail.expense_receipts?.length || 0,
          itemCount: cachedDetail.expense_items?.length || 0,
        },
      });
      detailDisplayMeasurement = null;

      if (isFreshCachedDetail) {
        setDetailRefreshingId(null);
        return;
      }

      detailRefreshMeasurement = startExpenseReportPerformanceMeasurement({
        metric: 'detail_refresh',
        meta: {
          scenario: detailDisplayScenario,
          cacheState: 'stale',
          reportId,
        },
      });
      setDetailRefreshingId(reportId);
    } else {
      detailDisplayMeasurement = startExpenseReportPerformanceMeasurement({
        metric: 'detail_display',
        meta: {
          scenario: detailDisplayScenario,
          cacheState: 'miss',
          reportId,
        },
      });
      setDetailLoadingId(reportId);
      setDetailRefreshingId(null);
      setSelectedReport(null);
    }

    try {
      const report = await getExpenseReport(reportId, { token });

      if (requestId !== detailRequestIdRef.current) {
        completeExpenseReportPerformanceMeasurement(detailDisplayMeasurement, {
          outcome: 'canceled',
          meta: { reportId },
        });
        completeExpenseReportPerformanceMeasurement(detailRefreshMeasurement, {
          outcome: 'canceled',
          meta: { reportId },
        });
        return;
      }

      if (!report) {
        throw new Error('상세 문서를 찾을 수 없습니다.');
      }

      setCachedExpenseReportDetail(detailCacheKey, report);
      setSelectedReport(report);
      completeExpenseReportPerformanceMeasurement(detailDisplayMeasurement, {
        meta: {
          receiptCount: report.expense_receipts?.length || 0,
          itemCount: report.expense_items?.length || 0,
        },
      });
      detailDisplayMeasurement = null;
      completeExpenseReportPerformanceMeasurement(detailRefreshMeasurement, {
        meta: {
          receiptCount: report.expense_receipts?.length || 0,
          itemCount: report.expense_items?.length || 0,
        },
      });
      detailRefreshMeasurement = null;
    } catch (viewError) {
      if (requestId !== detailRequestIdRef.current) {
        completeExpenseReportPerformanceMeasurement(detailDisplayMeasurement, {
          outcome: 'canceled',
          meta: { reportId },
        });
        completeExpenseReportPerformanceMeasurement(detailRefreshMeasurement, {
          outcome: 'canceled',
          meta: { reportId },
        });
        return;
      }

      completeExpenseReportPerformanceMeasurement(detailDisplayMeasurement, {
        outcome: 'failed',
        meta: {
          reportId,
          errorMessage: viewError.message,
        },
      });
      completeExpenseReportPerformanceMeasurement(detailRefreshMeasurement, {
        outcome: 'failed',
        meta: {
          reportId,
          errorMessage: viewError.message,
        },
      });

      if (!cachedDetail) {
        setShowDetail(false);
        setSelectedReport(null);
        alert(`상세 조회에 실패했습니다: ${viewError.message}`);
      }
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setDetailLoadingId(null);
        setDetailRefreshingId(null);
      }
    }
  };

  /**
   * 열려 있는 상세 모달을 닫고 진행 중인 상세 요청 응답을 무시합니다.
   * @returns {void}
   */
  const handleCloseDetail = () => {
    detailRequestIdRef.current += 1;
    setDetailLoadingId(null);
    setDetailRefreshingId(null);
    setShowDetail(false);
    setSelectedReport(null);
  };

  /**
   * 임시저장 문서를 수정 화면으로 이동시킵니다.
   * @param {string} reportId
   * @returns {void}
   */
  const handleEdit = (reportId) => {
    navigate(`/expense/create/${reportId}`);
  };

  /**
   * 결의서를 삭제하고 현재 페이지 목록을 최신 상태로 다시 조회합니다.
   * @param {string} reportId
   * @returns {Promise<void>}
   */
  const handleDelete = async (reportId) => {
    try {
      await deleteExpenseReport(reportId);
      setDeleteConfirmId(null);
      clearExpenseReportPageCacheForUser(user?.id);
      clearExpenseReportDetailCacheForReport(user?.id, reportId);
      await fetchReports();
    } catch (deleteError) {
      alert(`삭제에 실패했습니다: ${deleteError.message}`);
    }
  };

  /**
   * 처리 체크 상태를 목록에서 즉시 반영하고 실패 시 되돌립니다.
   * 성공 후에는 캐시를 비우고 현재 페이지를 다시 검증합니다.
   * @param {string} reportId
   * @param {'director_confirmed'|'payment_completed'|'print_completed'} field
   * @param {boolean} currentValue
   * @returns {Promise<void>}
   */
  const handleCheckToggle = async (reportId, field, currentValue) => {
    const updatingKey = `${reportId}-${field}`;
    const nextValue = !currentValue;
    const checkField = CHECK_FIELDS.find((item) => item.field === field);
    const checkLabel = checkField?.label || '체크 항목';
    const checkerName = nextValue ? (user?.name || '확인자') : null;
    const previousCheckerName = reports.find((report) => report.id === reportId)?.[`${field}_by`] || null;
    const confirmMessage = getCheckConfirmMessage(checkLabel, nextValue);

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setUpdatingCheck(updatingKey);

    setReportPage((prevPage) => ({
      ...prevPage,
      items: prevPage.items.map((report) => (
        report.id === reportId
          ? { ...report, [field]: nextValue, [`${field}_by`]: checkerName }
          : report
      )),
    }));

    try {
      await updateExpenseReportCheck(reportId, field, nextValue, checkerName);
      clearExpenseReportPageCacheForUser(user?.id);
      clearExpenseReportDetailCacheForReport(user?.id, reportId);
      await fetchReports();
    } catch (updateError) {
      setReportPage((prevPage) => ({
        ...prevPage,
        items: prevPage.items.map((report) => (
          report.id === reportId
            ? { ...report, [field]: currentValue, [`${field}_by`]: previousCheckerName }
            : report
        )),
      }));
      alert(`체크 업데이트에 실패했습니다: ${updateError.message}`);
    } finally {
      setUpdatingCheck(null);
    }
  };

  /**
   * 현재 페이지 기준으로 목록 번호를 계산합니다.
   * @param {number} index
   * @returns {number}
   */
  const getListRowNumber = (index) => {
    return reportPage.total_count - ((reportPage.page - 1) * reportPage.limit) - index;
  };

  /**
   * 체크 필터를 변경하면서 1페이지로 이동합니다.
   * @param {'director_confirmed'|'payment_completed'|'print_completed'} field
   * @param {string} value
   * @returns {void}
   */
  const handleFilterChange = (field, value) => {
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * 모든 필터를 초기화하고 1페이지로 돌아갑니다.
   * @returns {void}
   */
  const handleFilterReset = () => {
    setCurrentPage(1);
    setFilters(createDefaultFilters());
  };

  /**
   * 페이지 이동 시 같은 페이지 중복 요청을 막고 대상 페이지를 변경합니다.
   * @param {number} nextPage
   * @returns {void}
   */
  const handlePageChange = (nextPage) => {
    if (pageTransitioning || nextPage === currentPage) {
      return;
    }

    const nextCacheKey = createExpenseReportPageCacheKey({
      userId: user?.id || '',
      page: nextPage,
      limit: REPORTS_PER_PAGE,
      filters,
    });
    const nextCachedEntry = getCachedExpenseReportPageEntry(nextCacheKey);
    const nextCachedPage = nextCachedEntry?.pageData || null;

    setError(null);

    if (nextCachedPage) {
      hasLoadedListRef.current = true;
      setReportPage(nextCachedPage);
      setLoading(false);
      setPageTransitioning(false);
      setBackgroundRefreshing(!isExpenseReportPageCacheFresh(nextCachedEntry));
    } else if (hasLoadedListRef.current) {
      setPageTransitioning(true);
      setBackgroundRefreshing(false);
    }

    setCurrentPage(nextPage);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="mb-3 h-9 w-9 animate-spin text-navy-400" />
        <p className="text-sm text-mist-500">결의서 목록을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fadeIn rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-9 w-9 text-red-400" />
        <p className="mb-4 text-sm font-medium text-red-600">{error}</p>
        <button
          onClick={() => void fetchReports()}
          className="rounded-xl bg-navy-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-600"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slideUp pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-navy-50 p-2">
            <Receipt className="h-5 w-5 text-navy-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy-500">지출결의서 보기</h2>
            <div className="flex items-center gap-2 text-xs text-mist-500">
              <span>총 {reportPage.scope_total_count}건</span>
              {showListRefreshingState && (
                <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 font-semibold text-navy-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  목록 최신화 중
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/expense/create')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gold-400 px-3 py-2 text-xs font-semibold text-navy-700 shadow-sm transition-all hover:bg-gold-500"
        >
          <FilePlus className="h-4 w-4" />
          새 결의서
        </button>
      </div>

      <div className="space-y-2 rounded-xl border border-mist-200 bg-white p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {CHECK_FIELDS.map(({ field, label }) => (
            <div key={field} className="min-w-[100px] flex-1">
              <select
                value={filters[field]}
                onChange={(event) => handleFilterChange(field, event.target.value)}
                className={`
                  w-full cursor-pointer rounded-lg border px-2 py-1.5 text-[11px] font-medium outline-none transition-all
                  ${filters[field] === 'all'
                    ? 'border-mist-200 bg-mist-50 text-mist-500'
                    : 'border-navy-300 bg-navy-50 font-bold text-navy-600'}
                `}
              >
                <option value="all">{label}: 전체</option>
                <option value="checked">완료</option>
                <option value="unchecked">미완료</option>
              </select>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-mist-50 px-1 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-mist-400">검색결과</span>
            <span className="text-[11px] font-bold text-navy-500">{reportPage.total_count}건</span>
          </div>

          {hasActiveFilter && (
            <button
              onClick={handleFilterReset}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold text-red-500 transition-colors hover:bg-red-50"
            >
              <span>초기화</span>
              <span className="text-[12px]">×</span>
            </button>
          )}
        </div>
      </div>

      {reportPage.scope_total_count === 0 ? (
        <div className="rounded-2xl border border-mist-200 bg-white p-14 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-100">
            <FileText className="h-8 w-8 text-mist-300" />
          </div>
          <h3 className="mb-1.5 text-sm font-bold text-navy-500">작성된 결의서가 없습니다</h3>
          <p className="mb-5 text-xs text-mist-500">새 결의서를 작성해서 제출하거나 임시저장해보세요.</p>
          <button
            onClick={() => navigate('/expense/create')}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-navy-600"
          >
            <FilePlus className="h-4 w-4" />
            지출결의서 작성하기
          </button>
        </div>
      ) : reportPage.total_count === 0 ? (
        <div className="rounded-2xl border border-mist-200 bg-white p-14 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-100">
            <FileText className="h-8 w-8 text-mist-300" />
          </div>
          <h3 className="mb-1.5 text-sm font-bold text-navy-500">조건에 맞는 결의서가 없습니다</h3>
          <p className="text-xs text-mist-500">필터를 초기화하거나 다른 조건으로 다시 확인해주세요.</p>
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="hidden overflow-x-auto rounded-2xl border border-mist-200 bg-white shadow-sm md:block">
              <table className="w-full min-w-[1120px] table-fixed text-sm">
                <colgroup>
                  <col style={{ width: '56px' }} />
                  <col style={{ width: '190px' }} />
                  <col style={{ width: '130px' }} />
                  <col />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '190px' }} />
                  <col style={{ width: '92px' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-mist-200 bg-cream-100">
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-mist-500">No.</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-mist-500">결의일자</th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-mist-500">금액</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-mist-500">주요 내역</th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold text-mist-500">상태</th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold text-mist-500">처리현황</th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold text-mist-500">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-100">
                  {reports.map((report, index) => {
                    const canEditDraft = canEditDraftReport(report, user?.id);

                    return (
                      <tr key={report.id} className="group transition-colors hover:bg-cream-100/60">
                        <td className="whitespace-nowrap px-3 py-3.5 text-xs text-mist-400">
                          {getListRowNumber(index)}
                        </td>
                        <td className="px-3 py-3.5 text-sm text-navy-500">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 whitespace-nowrap font-medium">
                              {formatDate(report.resolution_date)}
                            </span>
                            <span className="shrink-0 text-xs text-mist-400">|</span>
                            <span className="min-w-0 truncate whitespace-nowrap text-xs font-medium text-mist-500">
                              {getReportAuthorName(report)}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-right text-sm font-bold text-navy-500 tabular-nums">
                          {(report.total_amount || 0).toLocaleString()}원
                        </td>
                        <td className="truncate whitespace-nowrap px-3 py-3.5 text-sm text-mist-500">
                          {report.first_item_summary || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-center">
                          <StatusBadge status={report.status} />
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex flex-col gap-1">
                            {CHECK_FIELDS.map(({ field, label }) => (
                              <CheckItem
                                key={field}
                                label={label}
                                checked={!!report[field]}
                                checkedBy={report[`${field}_by`]}
                                canEdit={canManageChecks}
                                updating={updatingCheck === `${report.id}-${field}`}
                                onToggle={() => handleCheckToggle(report.id, field, !!report[field])}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {canEditDraft && (
                              <button
                                onClick={() => handleEdit(report.id)}
                                className="rounded-lg p-2 text-gold-500 transition-colors hover:bg-gold-50 hover:text-gold-700"
                                title="계속 작성"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleView(report.id)}
                              disabled={detailLoadingId === report.id}
                              className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-600 disabled:cursor-wait disabled:opacity-50"
                              title="상세 보기"
                            >
                              {detailLoadingId === report.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(report.id)}
                              className="rounded-lg p-2 text-mist-300 opacity-0 transition-colors hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {reports.map((report, index) => {
                const canEditDraft = canEditDraftReport(report, user?.id);

                return (
                  <div key={report.id} className="overflow-hidden rounded-2xl border border-mist-200 bg-white">
                    <div
                      onClick={() => handleView(report.id)}
                      className={`cursor-pointer p-4 transition-colors active:bg-cream-100 ${
                        detailLoadingId === report.id ? 'cursor-wait opacity-80' : ''
                      }`}
                    >
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-xs text-mist-400">#{getListRowNumber(index)}</span>
                        <div className="flex items-center gap-2">
                          {detailLoadingId === report.id && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-semibold text-navy-500">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              불러오는 중
                            </span>
                          )}
                          <StatusBadge status={report.status} />
                        </div>
                      </div>
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-sm font-medium text-navy-400">
                            {formatDate(report.resolution_date)}
                          </span>
                          <span className="text-[11px] text-mist-300">|</span>
                          <span className="truncate text-xs font-medium text-mist-500">
                            {getReportAuthorName(report)}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-navy-500 tabular-nums">
                          {(report.total_amount || 0).toLocaleString()}원
                        </span>
                      </div>
                      <p className="truncate text-xs text-mist-400">{report.first_item_summary || '-'}</p>
                    </div>

                    <div className="border-t border-mist-100 bg-cream-100/40 px-4 pb-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {CHECK_FIELDS.map(({ field, label }) => (
                          <CheckItem
                            key={field}
                            label={label}
                            checked={!!report[field]}
                            checkedBy={report[`${field}_by`]}
                            canEdit={canManageChecks}
                            updating={updatingCheck === `${report.id}-${field}`}
                            onToggle={() => handleCheckToggle(report.id, field, !!report[field])}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-mist-100 px-4 py-2.5">
                      <span className="text-xs text-mist-400">{report.item_count || 0}개 항목</span>
                      <div className="flex items-center gap-3">
                        {canEditDraft && (
                          <button
                            onClick={() => handleEdit(report.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-gold-600"
                          >
                            <Pencil className="h-3 w-3" />
                            계속 작성
                          </button>
                        )}
                        <button
                          onClick={() => handleView(report.id)}
                          disabled={detailLoadingId === report.id}
                          className="flex items-center gap-1 text-xs font-medium text-navy-400 disabled:cursor-wait disabled:opacity-50"
                        >
                          {detailLoadingId === report.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Eye className="h-3 w-3" />}
                          상세 보기
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {showListTransitionState && (
              <div className="absolute inset-0 z-10 flex cursor-wait items-start justify-center rounded-2xl bg-white/60 px-4 pt-4 backdrop-blur-[1px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-navy-100 bg-white px-3 py-2 text-xs font-semibold text-navy-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {currentPage}페이지 목록을 불러오는 중입니다.
                </div>
              </div>
            )}
          </div>

          {reportPage.total_pages > 1 && (
            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-mist-400">
                {(showListTransitionState || showListRefreshingState) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-navy-400" />
                )}
                <span>
                  {showListTransitionState
                    ? `${currentPage}페이지를 불러오는 중`
                    : showListRefreshingState
                      ? `${reportPage.page}페이지 최신 정보를 확인하는 중`
                    : `${reportPage.page} / ${reportPage.total_pages} 페이지`}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={showListTransitionState || !reportPage.has_prev}
                  className="rounded-lg border border-mist-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-500 transition-colors hover:border-navy-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  이전
                </button>

                {Array.from({ length: reportPage.total_pages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    disabled={showListTransitionState}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      pageNumber === currentPage
                        ? 'border-navy-500 bg-navy-500 text-white'
                        : 'border-mist-200 bg-white text-navy-500 hover:border-navy-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {showListTransitionState && pageNumber === currentPage && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      <span>{pageNumber}</span>
                    </span>
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(Math.min(reportPage.total_pages, currentPage + 1))}
                  disabled={showListTransitionState || !reportPage.has_next}
                  className="rounded-lg border border-mist-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-500 transition-colors hover:border-navy-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative w-full max-w-sm animate-slideUp rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-navy-500">결의서 삭제</h3>
            <p className="mb-6 text-sm leading-relaxed text-mist-500">
              정말로 이 지출결의서를 삭제하시겠습니까?
              <br />
              삭제된 데이터는 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl bg-cream-100 py-2.5 text-sm font-medium text-navy-500 transition-colors hover:bg-mist-200"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <ExpenseReportDetailModal
          key={selectedReport?.id || detailLoadingId || 'detail-loading'}
          report={selectedReport}
          loading={isDetailLoading}
          refreshing={isDetailRefreshing}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default ExpenseReport;
