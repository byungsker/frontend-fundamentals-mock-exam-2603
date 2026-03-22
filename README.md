# 토스 Frontend Developer 면접 과제 🔥

## Getting started

```sh
nvm use 22
yarn install
yarn start
```

## Testing

아래 명령어로 더미 데이터에 기반한 구현을 테스트할 수 있습니다.

```sh
yarn test
```

## 리팩토링 요약

> 목표: 서비스의 유지보수나 장기적인 확장성을 고려한 설계, 추상화 관점에 집중

상세 분석 및 각 항목별 적용 내역은 [`docs/refactoring-plan.md`](./docs/refactoring-plan.md) 참조.

### 핵심 원칙: 관심사 분리

"각 코드가 하나의 이유로만 변경되도록" 구조를 개선했습니다.

```
┌─────────────────────────────────────┐
│  UI (페이지/컴포넌트)                │  ← 렌더링만 담당
│  FilterPanel, ReservationTimeline  │
├─────────────────────────────────────┤
│  Hooks (커스텀 훅)                   │  ← 상태 + 로직 조합
│  useNotification                   │
├─────────────────────────────────────┤
│  Queries (데이터 패칭)               │  ← 서버 상태 관리
│  useRooms, useReservations         │
├─────────────────────────────────────┤
│  API (통신)                         │  ← HTTP 호출만
│  http.ts, remotes.ts              │
├─────────────────────────────────────┤
│  Utils / Constants (공유)           │  ← 순수 함수, 상수
│  formatDate, EQUIPMENT_LABELS      │
└─────────────────────────────────────┘
```

### 완료 항목

| # | 항목 | 내용 |
|---|------|------|
| 1.1 | 폴더 구조 분리 | `pages/`에 섞여있던 비페이지 모듈을 `api/`, `layouts/`, `router/`로 분리 |
| 1.2 | 인덱스 라우트 검토 | re-export, 리네이밍, 리다이렉트를 검토 후 현행 유지 결론 |
| 1.3 | 컴포넌트 분해 | 500~600줄 모놀리식 페이지를 FilterPanel, AvailableRoomList, ReservationTimeline, MyReservationsList로 분해 |
| 1.4 | Error Boundary | 렌더링 에러 시 빈 화면 대신 fallback UI 표시 |
| 2.1 | 타입 인터페이스 활용 | 인라인 타입 반복을 기존 Room/Reservation 인터페이스 import로 교체 |
| 2.2 | 커스텀 쿼리 훅 | useQuery/useMutation을 커스텀 훅으로 분리 |
| 2.3 | 공통 모듈 추출 | 3곳에 중복된 상수/유틸 함수를 `constants/`, `utils/`로 추출 |
| 2.4 | 필터링 로직 개선 | 4가지 조건이 뭉친 콜백을 조건별 체인으로 분리, 순수 함수 추출 |
| 2.5+2.6 | 알림/에러 패턴 통일 | useNotification 훅 + getErrorMessage 유틸로 양쪽 페이지 통일 |
| 2.7 | 쿼리 키 중앙 관리 | 매직 스트링을 queryKeys.ts로 중앙 관리 |

### 미완료 항목 (분석 완료, 구현 미진행)

리팩토링 계획서에 분석 결과와 제안이 기록되어 있습니다:

- 3.1~3.2: import 순서 및 컴포넌트 내부 선언 순서 통일
- 4.1~4.2: 클라이언트-서버 검증 로직 중복, HTTP POST 래퍼 이슈
- 5.1~5.2: staleTime 미설정, 캐시 무효화 불일치
- 6.1~6.6: 과거 시간 선택 방지, 지난 예약 필터링, 공유 링크 버튼, 타임라인 엣지케이스, location.state 메시지 영구 노출, 타임존 미고려
- 7.1: 파생 데이터에 useMemo 미적용

## 프로젝트 구조

```
src/
├── api/                  # HTTP 클라이언트, API 엔드포인트 함수
├── components/           # 공통 컴포넌트 (ErrorBoundary)
├── constants/            # 공유 상수 (booking.ts)
├── hooks/                # 공통 커스텀 훅 (useNotification)
├── layouts/              # 레이아웃 컴포넌트
├── queries/              # React Query 커스텀 훅, 쿼리 키
├── router/               # 라우트 정의
├── utils/                # 유틸 함수 (date, reservationFilter, errorHandler)
├── pages/
│   ├── RoomBookingPage/  # 예약하기 페이지 + FilterPanel, AvailableRoomList
│   └── ReservationStatusPage/  # 예약 현황 페이지 + ReservationTimeline, MyReservationsList
└── _tosslib/             # 내부 디자인 시스템 (수정하지 않음)
```
