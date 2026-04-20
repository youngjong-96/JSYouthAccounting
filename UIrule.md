# 디자인 방향
앱을 중심으로 디자인하지만 모든 페이지를 반응형으로 구현하여 웹에서도 자연스럽게 보이도록 앱과 웹을 모두 고려한 디자인 적용

---

# 사용 색상

| 이름 | HEX | 용도 |
|------|-----|------|
| Navy | `#333D51` | 텍스트, 버튼, 헤더 배경 (primary) |
| Gold | `#D3AC2B` | 강조, 포인트, 링크, 액티브 상태 (accent) |
| Mist | `#CBD0D8` | 보조 텍스트, 보더, 비활성 상태 |
| Cream | `#F4F3EA` | 기본 배경, 카드 배경 |

### Tailwind 사용 예시
- 기본 배경: `bg-cream-100`
- 주요 텍스트: `text-navy-500`
- 강조 포인트: `text-gold-400` / `bg-gold-400`
- 보더/보조: `border-mist-200` / `text-mist-500`

---

# 사용 글꼴
G마켓 산스 (GmarketSans)
- Light (300): 보조 텍스트, 설명
- Medium (500): 본문, 일반 내용
- Bold (700): 제목, 버튼, 강조

---

# 컴포넌트 규칙

## 버튼
- **Primary**: `bg-navy-500` 배경, 흰색 텍스트, `rounded-xl`, `py-3.5` (터치 최소 48px)
- **Secondary**: `bg-white border-2 border-mist-200` 배경, navy 텍스트
- **Accent**: `bg-gold-400` 배경, 흰색 텍스트 (중요 CTA)
- 호버 시 한 단계 진한 색상(`-600`) 적용, `transition-all` 필수
- 비활성(disabled): `opacity-50`

## 입력 필드
- `border-2 border-mist-200`, `rounded-xl`, `py-3.5`, `text-[16px]` (iOS 줌 방지)
- 포커스: `focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30`
- 배경: `bg-white`

## 카드
- `bg-white rounded-2xl` 기본
- 그림자: `shadow-sm` (기본) / `shadow-md` (강조)
- 보더: `border border-mist-200` (선택)

## 헤더 / 페이지 상단
- 배경: `bg-gradient-to-br from-navy-500 via-navy-600 to-navy-800`
- 장식용 골드 원: `opacity-10` 으로 은은하게
- 하단 곡선 SVG로 자연스러운 전환
- 텍스트: 제목 `text-white`, 부제 `text-white/60`

## 에러 메시지
- `bg-red-50 border border-red-200 text-red-600 rounded-xl` + `animate-fadeIn`

---

# 반응형 기준

| Breakpoint | 적용 |
|-----------|------|
| 기본 (모바일) | 단일 컬럼, 큰 터치 영역 |
| `sm` (640px~) | 패딩 증가, 폰트 약간 확대 |
| `md` (768px~) | 사이드바 상시 표시, 2컬럼 레이아웃 가능 |

---

# 모바일 UX 규칙
- 모든 터치 영역 최소 **48×48px** 확보 (`py-3` 이상)
- `input` 폰트 **16px 이상** 유지 → iOS Safari 자동 줌 방지
- 노치/홈 인디케이터 대응: `safe-top`, `safe-bottom` 유틸리티 클래스 사용
- `-webkit-tap-highlight-color: transparent` 전역 적용
- 스크롤 목록에서 터치 피드백: `active:bg-*` 상태 명시

---

# 애니메이션 & 트랜지션
- 페이지 진입 요소: `animate-slideUp` (translateY 20→0, 0.4s)
- 모달/오버레이 진입: `animate-fadeIn` (opacity 0→1, 0.3s)
- 버튼/인터랙션: `transition-all` (기본값 150ms)
- 불필요한 애니메이션 지양 → 속도감 있는 UX 유지

---

# 아이콘
- 라이브러리: `lucide-react`
- 크기: 일반 `w-5 h-5`, 강조 `w-6 h-6`, 큰 아이콘 `w-8 h-8`
- 색상: 컨텍스트에 맞는 팔레트 색상 사용

---

# 추천 추가 룰 (제안)

> 아래 항목들은 추후 논의 후 확정 권장

## 로딩 상태
- 버튼 로딩: `<Loader2 className="animate-spin" />` + 텍스트
- 페이지/리스트 로딩: 중앙 스피너 (`text-navy-500`)
- 스켈레톤 UI: 콘텐츠가 많은 리스트 페이지에 적용 고려

## 빈 상태 (Empty State)
- 아이콘 + 제목 + 설명 + CTA 버튼 구조
- 아이콘 컨테이너: `bg-mist-100 rounded-2xl p-5`

## 토스트 알림
- 우측 상단 고정, `rounded-xl shadow-lg`
- 성공: `bg-green-600`, 에러: `bg-red-600`
- 자동 소멸 (1.5~2초)

## 모달
- 백드롭: `bg-navy-900/60 backdrop-blur-sm`
- 컨테이너: `rounded-2xl bg-white shadow-2xl`
- 닫기: 백드롭 클릭 또는 X 버튼

## 접근성
- 모든 `input`에 `id` 및 연결된 `label` 필수
- 아이콘 전용 버튼에 `title` 또는 `aria-label` 추가
- 충분한 색상 대비 유지 (WCAG AA 기준)
