# 리팩토링 계획서

> 목표: 서비스의 유지보수나 장기적인 확장성을 고려한 설계, 추상화 관점에 집중

## 1. 구조적 개선점

### 1.1 `src/pages/` 하위 모듈을 관심사별 폴더로 분리 ✅

현재 `src/pages/` 직하에 페이지가 아닌 모듈(API 클라이언트, 레이아웃, 라우트 정의)이 섞여 있어 어색함:

| 현재 경로                  | 제안 경로                    | 이유                             |
| -------------------------- | ---------------------------- | -------------------------------- |
| `src/pages/http.ts`        | `src/api/http.ts`            | HTTP 클라이언트는 API 레이어     |
| `src/pages/remotes.ts`     | `src/api/remotes.ts`         | API 엔드포인트 함수도 API 레이어 |
| `src/pages/PageLayout.tsx` | `src/layouts/PageLayout.tsx` | 레이아웃은 별도 폴더             |
| `src/pages/Routes.tsx`     | `src/Routes.tsx`             | 라우트 정의는 src 루트           |

#### 적용 내역

**변경한 것:**

- `http.ts`, `remotes.ts` → `src/api/`로 이동 (API 통신 레이어)
- `PageLayout.tsx` → `src/layouts/`로 이동 (레이아웃 컴포넌트)
- `Routes.tsx` → `src/router/`로 이동 (라우트 정의)
- `tsconfig.json`, `vite.config.ts`에 `api`, `layouts`, `router` path alias 추가
- 모든 import 경로 일괄 수정 (`pages/http` → `api/http`, `pages/remotes` → `api/remotes` 등)

**왜 이렇게 했는가:**

- `src/pages/`는 페이지 컴포넌트만 담는 폴더여야 하는데, HTTP 클라이언트·API 함수·레이아웃·라우트 정의가 섞여 있으면 폴더의 역할이 모호해짐
- 관심사별로 분리하면 "API 관련 코드는 `api/`에서, 라우팅은 `router/`에서" 찾을 수 있어 탐색 비용이 줄어듦

**계획과 달라진 점:**

- 원래 `Routes.tsx`를 `src/` 루트(`src/Routes.tsx`)로 이동하려 했으나, 테스트 실행 시 vite가 `import { Routes } from 'Routes'`를 resolve하지 못하는 문제가 발생함. vite는 `tsconfig`의 `baseUrl`을 자동 인식하지 않고 명시적 alias만 사용하는데, 기존 alias가 모두 폴더 단위(`pages/*`, `api/*` 등)로 구성되어 있어 단일 파일을 src 루트에 두면 이 패턴이 깨짐. 폴더 단위 alias 패턴을 유지하기 위해 `src/router/Routes.tsx`로 변경함

**검증:** `tsc --noEmit` 통과, `vitest run` 20개 테스트 전체 통과

### 1.2 ReservationStatusPage가 `/`인 점 ✅

- `Routes.tsx`에서 `ReservationStatusPage`를 `/` 인덱스로 지정하고 있음
- 폴더 구조만 보면 어떤 페이지가 홈인지 단번에 파악하기 어려움

#### 검토한 방안

1. **`pages/index.tsx`에서 re-export** — `export { ReservationStatusPage as HomePage }`로 alias 제공
2. **`ReservationStatusPage` 폴더를 `HomePage`로 리네이밍** — 가장 직관적이지만 페이지 역할이 이름에서 사라짐
3. **`pages/index.tsx`에서 리다이렉트** — 불필요한 렌더 사이클 추가

#### 결론: 현행 유지

- re-export 방식은 간접 참조를 하나 더 만들어 오히려 탐색 비용이 늘어남 (Cmd+클릭 시 `pages/index.tsx` → `ReservationStatusPage`로 두 번 따라가야 함)
- 실무에서 "어떤 페이지가 `/`인지" 궁금하면 `Routes.tsx`를 보는 것이 자연스러움. 라우트 파일이 그 역할을 하는 것이 React Router의 관용적 패턴
- 같은 컴포넌트에 `ReservationStatusPage`와 `HomePage` 두 이름이 생기면 팀원 간 혼란 가능
- 현행 구조가 더 적절하다고 판단하되, 다른 과제 참여자들의 의견도 궁금함

### 1.3 페이지 컴포넌트가 모놀리식 ✅

- `RoomBookingPage` 594줄, `ReservationStatusPage` 471줄 — 단일 컴포넌트에 모든 로직이 집중
- `requirements.md`에도 `FilterPanel`, `AvailableRoomList`, `Timeline`, `MyReservations` 같은 단위가 명시되어 있음
- 한 컴포넌트가 URL 상태 동기화, 필터링 로직, API mutation, 에러 핸들링, 폼 렌더링, 결과 렌더링을 전부 담당
- 개별 단위 테스트 불가, 재사용 불가, 인지 부하 높음

#### 분리 기준 판단

컴포넌트 분리에는 두 가지 기준이 있음:

1. **재사용 (DRY)** — 2곳 이상에서 쓰일 때 분리. 현재 코드에서 추출 대상 섹션은 각 페이지에서만 사용되므로 재사용 기준으로는 분리 불필요
2. **관심사 분리 (SRP)** — 한 파일이 너무 많은 것을 알고 있을 때. 500줄짜리 컴포넌트는 한 명이 전체를 이해해야 수정 가능

→ **관심사 분리 기준**으로 시각/기능 블록 단위 분해 선택

#### 적용 내역

**변경한 것:**

| 페이지 | 추출된 컴포넌트 | 역할 |
|--------|----------------|------|
| `RoomBookingPage` | `FilterPanel` | 날짜, 시간, 인원, 장비, 층 입력 폼 + 검증 에러 표시 |
| `RoomBookingPage` | `AvailableRoomList` | 필터된 회의실 목록 + 선택 + 예약 버튼 |
| `ReservationStatusPage` | `ReservationTimeline` | 시간 헤더 + 회의실별 예약 바 + 툴팁 (activeReservation 상태 자체 소유) |
| `ReservationStatusPage` | `MyReservationsList` | 내 예약 목록 + 취소 버튼 |

**왜 이 단위로 분리했는가:**

- `FilterPanel`: 6개 입력 필드(날짜, 시작/종료 시간, 인원, 장비, 층)가 하나의 "예약 조건"이라는 맥락을 공유함. 이 중 하나만 떼어내면(예: 장비 선택만 분리) 조건 간 관계가 끊어짐 — 장비 변경 시 `handleFilterChange`로 선택 초기화가 필요한데, 이 흐름이 컴포넌트 경계를 넘게 됨. 더 쪼개는 건 이후 공통 폼 컴포넌트(LabeledSelect 등) 추출 시 자연스럽게 진행 가능
- `AvailableRoomList`: 필터 결과를 "보여주고 선택받는" 역할. FilterPanel과 분리한 이유는 변경 이유가 다르기 때문 — FilterPanel은 입력 UI 변경 시, AvailableRoomList는 결과 표시 방식 변경 시 수정됨
- `ReservationTimeline`: 타임라인은 시간 계산(`timeToMinutes`, `TOTAL_MINUTES`), 위치 계산(`left`, `width`), 툴팁 상태(`activeReservation`)를 자체적으로 소유하는 독립된 시각화 단위. 페이지에서 받는 건 `rooms`와 `reservations` 데이터뿐
- `MyReservationsList`: 예약 목록 표시 + 취소 액션. 타임라인과는 데이터 소스(전체 예약 vs 내 예약)와 표시 방식(바 차트 vs 리스트)이 완전히 다름

**네이밍 근거:**

- `requirements.md`의 이름(`FilterPanel`, `AvailableRoomList`, `Timeline`, `MyReservations`)을 참고했으나 그대로 사용한 건 아님
- `ReservationTimeline`으로 변경한 이유: `Timeline`은 너무 범용적. "무엇의" 타임라인인지 이름에서 알 수 있어야 함
- `MyReservationsList`로 변경한 이유: `MyReservations`는 데이터를 가리키는 이름이지 컴포넌트 이름이 아님. `List` suffix로 "목록 UI 컴포넌트"임을 명시

**추출하지 않은 것과 그 이유:**

- `DatePickerSection` — 10줄 미만으로, 분리 시 props 전달 오버헤드가 코드량보다 큼
- `BackHeader`, `BookButton` — 한 줄 버튼. 별도 파일로 분리할 추상화 이득 없음
- `MessageBanner` / `ErrorBanner` — 2.5 알림 패턴 통일에서 별도로 다룰 예정

**왜 이렇게 했는가:**

- 각 페이지에 남는 것은 상태 선언, useQuery/useMutation, 비즈니스 로직, 에러 핸들링 — "무엇을 하는가" (로직)
- 추출된 컴포넌트는 props를 받아 렌더링만 담당 — "어떻게 보여주는가" (UI)
- 이 분리를 통해 이후 비즈니스 로직 훅 추출(2.2, 2.4)이 더 자연스러워짐

**검증:** `tsc --noEmit` 통과, `vitest run` 20개 테스트 전체 통과

### 1.4 Error Boundary 부재 ✅

- 앱 전체에 Error Boundary가 없음
- 쿼리 실패나 런타임 에러 시 앱 전체가 빈 화면으로 전환됨

#### 왜 필요한가

- React에서 컴포넌트 렌더링 중 에러가 발생하면 전체 컴포넌트 트리가 언마운트되어 빈 화면이 됨
- 사용자는 무슨 일이 일어났는지 알 수 없고, 복구할 방법도 없음 (새로고침 외에)
- Error Boundary는 에러를 캐치하여 fallback UI를 보여주고, 사용자가 "다시 시도"로 복구할 수 있게 함

#### 적용 내역

**변경한 것:**

- `src/components/ErrorBoundary.tsx` 신규 생성 — class 컴포넌트로 구현 (React의 Error Boundary는 class 컴포넌트에서만 지원)
- `src/App.tsx` — `<PageLayout>` 안, `<Routes />` 바깥에 `<ErrorBoundary>` 배치

**왜 이 위치에 배치했는가:**

- `PageLayout` 바깥에 두면 레이아웃 자체의 에러도 캐치하지만, 에러 시 레이아웃(모바일 프레임)이 사라져 fallback UI가 전체 화면에 뜸
- `PageLayout` 안, `Routes` 바깥에 두면 레이아웃은 유지되면서 페이지 렌더링 에러만 캐치 → fallback UI가 모바일 프레임 안에서 자연스럽게 표시됨

**검증:** `tsc --noEmit` 통과, `vitest run` 20개 테스트 전체 통과

## 2. 추상화 개선점

### 2.1 인라인 타입 반복 → 기존 인터페이스 활용 ✅

- `src/_tosslib/server/types.ts`에 `Room`, `Reservation`, `Equipment` 인터페이스가 이미 정의되어 있음
- 그런데 `src/pages/remotes.ts`와 페이지 컴포넌트에서 동일한 타입을 인라인으로 반복 선언하고 있음
  - 예: `(r: { roomId: string; date: string; start: string; end: string })` — `Reservation`과 동일
- 가독성 저하, 중복, 변경 시 누락 위험
- 개선: `remotes.ts`의 API 반환 타입에 `Room[]`, `Reservation[]`을 지정하고, 페이지 컴포넌트에서는 명시적 인터페이스 참조로 교체

#### 적용 내역

**변경한 것:**

- `src/api/remotes.ts`: API 반환 타입을 인라인에서 `Room[]`, `Reservation[]`로 교체, `createReservation` 파라미터를 `Omit<Reservation, 'id'>`로 변경
- `src/pages/RoomBookingPage/index.tsx`: `Equipment`, `Reservation`, `Room` import 추가, 6곳의 인라인 타입을 인터페이스 참조로 교체, `ALL_EQUIPMENT`와 `equipment` state 타입을 `Equipment[]`로 변경
- `src/pages/ReservationStatusPage/index.tsx`: `Room`, `Reservation` import 추가, 5곳의 인라인 타입을 인터페이스 참조로 교체

**왜 이렇게 했는가:**

- 근본 원인은 `remotes.ts`의 API 반환 타입이 인라인이라 타입 추론이 안 되는 것. 여기서 타입을 제대로 지정하면 하위 소비자(페이지 컴포넌트)에서 타입 추론이 작동함
- 콜백 매개변수(`res`, `room` 등)에는 명시적으로 타입을 달아둠 — 타입 추론만으로는 IDE에서 Cmd+클릭으로 인터페이스 정의로 점프할 수 없기 때문
- `Equipment[]` 도입으로 `string[]`보다 엄격한 타입 안전성 확보

**검증:** `tsc --noEmit` 통과, `vitest run` 20개 테스트 전체 통과

### 2.2 useQuery/useMutation → 커스텀 훅 분리 ✅

- 현재: 페이지 컴포넌트 내부에서 직접 `useQuery`, `useMutation` 호출
- 제안: `src/queries/` 폴더를 만들어 커스텀 훅으로 분리
  - 예: `useRooms()`, `useReservations(date)`, `useCreateReservation()`, `useCancelReservation()`

#### 적용 내역

**변경한 것:**

- `src/queries/queryKeys.ts` 신규 생성 — 쿼리 키 상수를 중앙 관리 (2.7도 함께 해결)
- `src/queries/useReservationQueries.ts` 신규 생성 — `useRooms`, `useReservations`, `useMyReservations`, `useCreateReservation`, `useCancelReservation` 5개 훅
- 양쪽 페이지에서 `useQuery`/`useMutation` 직접 호출 → 커스텀 훅으로 교체
- `tsconfig.json`, `vite.config.ts`에 `queries` alias 추가

**왜 이렇게 했는가:**

- `useQuery(['rooms'], getRooms)`가 양쪽 페이지에서 완전히 동일하게 중복. 커스텀 훅으로 한 곳에서 관리하면 쿼리 옵션(staleTime 등) 변경 시 한 곳만 수정하면 됨
- 캐시 무효화 로직(`invalidateQueries`)이 페이지마다 다르게 작성되어 있었음 (RoomBookingPage는 특정 날짜만, ReservationStatusPage는 전체). 뮤테이션 훅 안에 무효화 로직을 캡슐화하여 일관성 확보

**고민한 것들:**

- `as const`를 쓰지 않은 이유: React Query v4의 queryKey 타입이 `readonly unknown[]`이라 `string[]`이 그대로 할당 가능. v5의 `queryOptions` 패턴처럼 키 기반 타입 추론을 체이닝하는 경우가 아니면 불필요
- `useRooms`를 `useReservationQueries.ts`에 함께 둔 이유: 이 앱에서 rooms는 예약 플로우 안에서만 사용되며 독립적인 회의실 관리 기능이 없음. 회의실 관리 페이지가 추가되면 그때 분리
- 훅을 파일 5개로 분리하는 것도 검토했으나, 같은 도메인의 쿼리를 한 파일에 모아두는 것이 이 규모에서는 더 적절

**React Query v4→v5 deprecated 경고에 대해:**

커스텀 훅 작성 과정에서 `useQuery(queryKey, queryFn)`, `invalidateQueries(queryKey)`, `isLoading` 등에 deprecated 경고가 발생하는 것을 확인함. 이는 설치된 `@tanstack/react-query@^4.43.0`의 타입 정의가 v5 마이그레이션을 사전 안내하기 위해 기존 시그니처에 `@deprecated` 태그를 추가한 것이며, 현재 v4 런타임에서는 정상 동작함.

v5로 마이그레이션하면 `useQuery({ queryKey, queryFn })` 객체 형태, `isLoading` → `isPending` 등 breaking changes가 다수 포함되어 있어, 이미 잘 동작하도록 완성된 구현에서 마이그레이션하는 것은 런타임 에러를 유발할 수 있는 불필요한 위험을 만드는 것임. 팀 차원의 마이그레이션 계획 없이 개별적으로 API를 변경하는 것은 적절하지 않다고 판단하여 현행 v4 API를 유지함.

**검증:** `tsc --noEmit` 통과, `vitest run` 20개 테스트 전체 통과

### 2.3 상수/유틸 함수 중복 → 공통 모듈 추출

두 페이지에 동일한 코드가 중복:

| 중복 항목                                | 위치                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `EQUIPMENT_LABELS`                       | 양쪽 페이지                                                             |
| `TIME_SLOTS` 생성 로직                   | 양쪽 페이지                                                             |
| `formatDate()` 함수                      | 양쪽 페이지                                                             |
| `TIMELINE_START`, `TIMELINE_END` 등 상수 | `ReservationStatusPage` (매직 넘버로 `RoomBookingPage`에도 암묵적 존재) |

제안: `src/constants/booking.ts`, `src/utils/date.ts` 등으로 추출

### 2.4 필터링/검증 로직 분리 및 체이닝 개선

`RoomBookingPage`의 필터링 로직(용량, 장비, 층, 시간 충돌 체크)이 렌더 로직에 인라인으로 존재하며, `.filter()` 콜백 하나에 4가지 조건이 뭉쳐 있음:

```typescript
// Before: 하나의 콜백에 모든 조건
rooms.filter(room => {
  if (room.capacity < attendees) return false;
  if (!equipment.every(eq => room.equipment.includes(eq))) return false;
  if (preferredFloor !== null && room.floor !== preferredFloor) return false;
  const hasConflict = reservations.some(...);
  if (hasConflict) return false;
  return true;
}).sort(...)

// After: 조건별 체인 분리 + 복잡한 로직은 함수 추출
rooms
  .filter(room => room.capacity >= attendees)
  .filter(room => equipment.every(eq => room.equipment.includes(eq)))
  .filter(room => preferredFloor === null || room.floor === preferredFloor)
  .filter(room => !hasTimeConflict(room, reservations, date, startTime, endTime))
  .sort(byFloorThenName);
```

- 체이닝 자체는 유지 (선언적, 데이터 흐름이 보임)
- 각 `.filter()`가 하나의 조건만 담당 → 조건 추가/제거가 한 줄 단위로 가능
- 충돌 체크 같은 복잡한 로직은 함수로 추출 → 독립적 테스트 가능
- 비즈니스 로직을 UI에서 분리하면 `useAvailableRooms()` 커스텀 훅 또는 `src/utils/reservationFilter.ts`로 추출 가능

### 2.5 알림/메시지 패턴 통일

- `RoomBookingPage`: `errorMessage: string | null` (에러만)
- `ReservationStatusPage`: `message: { type: 'success' | 'error'; text: string } | null` (성공+에러)
- 동일한 앱인데 서로 다른 패턴 사용
- 제안: 공통 `useNotification()` 훅 또는 Toast 컴포넌트로 통일

### 2.6 에러 핸들링 불일치

- `RoomBookingPage`: `axios.isAxiosError` 체크 + 서버 메시지 파싱 (상세)
- `ReservationStatusPage`: `catch { }` 로 generic 메시지 (간략)
- 네트워크 에러, 검증 에러, 서버 에러를 구분하지 않음
- 제안: `src/utils/errorHandler.ts` 또는 HTTP 레이어에서 공통 에러 변환 처리

### 2.7 쿼리 키 매직 스트링 ✅

- `['rooms']`, `['reservations', date]`, `['myReservations']`가 두 파일에 흩어져 있음
- 한쪽만 변경 시 캐시 불일치 발생
- 2.2에서 커스텀 훅 분리와 함께 해결 — `src/queries/queryKeys.ts`에 상수로 중앙 관리

## 3. 코드 컨벤션 개선점

### 3.1 import 순서 통일

현재 두 페이지의 import 순서가 불일치:

- `RoomBookingPage`: emotion → react-query → tosslib → axios → remotes → types → react → react-router
- `ReservationStatusPage`: emotion → react → react-router → react-query → tosslib → remotes → types

제안 순서:

1. React / React 훅
2. 서드파티 라이브러리 (react-router, react-query, axios, emotion)
3. 내부 라이브러리 (\_tosslib)
4. 프로젝트 모듈 (api, queries, utils, types)

### 3.2 컴포넌트 내부 선언 순서

```
// ── 파일 최상단 (컴포넌트 바깥) ──
1. 타입 정의 (interface, type)
2. 상수 (EQUIPMENT_LABELS, TIME_SLOTS 등)
3. 유틸 함수 (순수 함수 — formatDate, timeToMinutes 등)

// ── 컴포넌트 함수 내부 ──
4. Hooks (useState, useEffect, useQuery, useMutation ...)
5. 파생 상태 / 계산값 (validationError, floors, availableRooms 등)
6. 이벤트 핸들러 / 콜백 (handleFilterChange, handleBook, handleCancel 등)
7. return JSX
```

## 4. API 레이어 개선점

### 4.1 클라이언트-서버 검증 로직 중복

- 시간 충돌 체크가 클라이언트(`RoomBookingPage`)와 서버(`handlers.ts`)에 각각 존재
- 조건이 미묘하게 다름: 클라이언트 `endTime <= startTime` vs 서버 `start >= end`
- 한쪽만 수정하면 불일치 발생
- 제안: 검증 로직을 공유 유틸로 추출하거나, 서버 검증을 신뢰하고 클라이언트는 UX용 가드만 유지

### 4.2 `http.ts`의 POST 래퍼 이슈

- `http.post`가 payload를 `{ data }` 로 한 번 더 감싸서 전송
- `handlers.ts`에서 `body?.data ?? body`로 양쪽을 대응하지만, API 계약이 불명확

## 5. 캐싱 개선점

### 5.1 staleTime 미설정

- React Query의 `staleTime`이 설정되지 않아 데이터가 fetch 직후 즉시 stale 처리됨
- `rooms` 데이터는 거의 변하지 않으므로 긴 `staleTime` 설정이 적절
- `reservations`는 더 짧은 `staleTime`으로 분리 설정 가능

### 5.2 캐시 무효화 불일치

- `RoomBookingPage`: `['reservations', date]` (특정 날짜만 무효화)
- `ReservationStatusPage`: `['reservations']` (모든 날짜 무효화)
- 예약 생성 후 다른 날짜를 보고 있던 탭은 stale 데이터를 유지할 수 있음

## 6. UX 개선점

### 6.1 과거 시간 선택 방지 (`src/pages/RoomBookingPage/index.tsx`)

- 예약 조건의 시작/종료 시간 Select에서 이미 지난 시간도 선택 가능
- 선택한 날짜가 오늘이면 현재 시각 이전 타임슬롯 비활성화 필요

### 6.2 지난 예약 필터링 (`src/pages/ReservationStatusPage/index.tsx`)

- "내 예약" 목록에 이미 지난 날짜의 예약까지 표시됨
- 지난 예약은 숨기거나 별도 섹션("지난 예약")으로 분리

### 6.3 공유 링크 버튼 (`src/pages/RoomBookingPage/index.tsx`)

- 예약 조건이 URL 쿼리 파라미터로 동기화되지만, 사용자가 이를 인지하기 어려움
- "조건 공유하기" 버튼을 추가하여 현재 URL을 클립보드에 복사하는 기능 제안

### 6.4 타임라인 렌더링 엣지 케이스

- 아주 짧은 예약(예: 30분 미만)은 타임라인 바가 너무 좁아 클릭/확인이 어려움 (`min-width` 미설정)
- 툴팁이 뷰포트 밖으로 넘칠 수 있음 (480px 모바일 레이아웃 기준)
- 겹치는 예약이 있을 경우 바가 서로 가려짐 (z-index 처리 없음)

### 6.5 `location.state` 메시지가 영구 노출

- 예약 성공 후 `navigate('/', { state: { message: '...' } })`로 메시지 전달
- `history.replaceState`로 네비게이션 state는 지우지만, 컴포넌트 local state는 유지됨
- 메시지가 자동으로 사라지지 않음 (타임아웃 또는 dismiss 버튼 필요)

#### 근거

1.1 파일 구조 리팩토링 후 테스트(`vitest run`) 실행 시, `ReservationStatusPage`에서 다음 경고가 발생함:

```
Warning: Can't perform a React state update on an unmounted component.
This is a no-op, but it indicates a memory leak in your application.
To fix, cancel all subscriptions and asynchronous tasks in a useEffect cleanup function.
    at ReservationStatusPage (.../src/pages/ReservationStatusPage/index.tsx:162:56)
```

코드 분석 시 예상한 문제가 테스트 로그에서 실제로 확인된 것. 컴포넌트가 언마운트된 후에도 `location.state`에서 읽은 메시지로 state 업데이트를 시도하고 있음. React 17에서는 경고가 노출되며 (React 18에서는 이 경고가 제거됨), 실제 메모리 릭은 아니지만 cleanup 로직이 누락되어 있다는 신호임.

### 6.6 타임존 미고려

- `new Date()`로 로컬 시간 기준 날짜를 사용
- 서버와 클라이언트의 시간대가 다른 경우 날짜 불일치 가능

## 7. 성능 개선점

### 7.1 파생 데이터에 useMemo 미적용

필터링/정렬 같은 계산이 컴포넌트 본문에 직접 있어 매 렌더마다 재실행됨:

```typescript
// Before: 매 렌더마다 재계산 (의존값이 안 바뀌어도)
const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
const availableRooms = isFilterComplete ? rooms.filter(...).sort(...) : [];
```

- `useMemo`로 감싸져 있지 않아 불필요한 연산 발생
- 현재 규모(회의실 10개)에선 체감 없지만, 확장 시 성능 이슈 가능
- 무엇보다 "이 값은 파생 데이터다"라는 의도가 코드에 표현되지 않음

```typescript
// After: 의존값이 바뀔 때만 재계산 + 의도 명확
const floors = useMemo(
  () => [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b),
  [rooms]
);

const availableRooms = useMemo(
  () => rooms.filter(...).sort(...),
  [rooms, reservations, date, startTime, endTime, attendees, equipment, preferredFloor]
);
```
