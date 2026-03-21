# 리팩토링 계획서

> 목표: 서비스의 유지보수나 장기적인 확장성을 고려한 설계, 추상화 관점에 집중

## 1. 구조적 개선점

### 1.1 `src/pages/` 하위 유틸 파일 위치 개선

현재 `src/pages/` 직하에 페이지가 아닌 파일이 섞여 있어 어색함:

| 현재 경로 | 제안 경로 | 이유 |
|-----------|-----------|------|
| `src/pages/http.ts` | `src/api/http.ts` | HTTP 클라이언트는 API 레이어 |
| `src/pages/remotes.ts` | `src/api/remotes.ts` | API 엔드포인트 함수도 API 레이어 |
| `src/pages/PageLayout.tsx` | `src/layouts/PageLayout.tsx` | 레이아웃은 별도 폴더 |
| `src/pages/Routes.tsx` | `src/Routes.tsx` | 라우트 정의는 src 루트 |

### 1.2 ReservationStatusPage가 `/`인 점

- `Routes.tsx`에서 `ReservationStatusPage`를 `/` 인덱스로 지정하고 있음
- 폴더 구조만 보면 어떤 페이지가 홈인지 단번에 파악하기 어려움
- 제안: `src/pages/index.tsx`를 만들어 `ReservationStatusPage`로 리다이렉트하는 방식

### 1.3 페이지 컴포넌트가 모놀리식

- `RoomBookingPage` 594줄, `ReservationStatusPage` 471줄 — 단일 컴포넌트에 모든 로직이 집중
- `requirements.md`에도 `FilterPanel`, `AvailableRoomList`, `Timeline`, `MyReservations` 같은 단위가 명시되어 있음
- 한 컴포넌트가 URL 상태 동기화, 필터링 로직, API mutation, 에러 핸들링, 폼 렌더링, 결과 렌더링을 전부 담당
- 개별 단위 테스트 불가, 재사용 불가, 인지 부하 높음

### 1.4 Error Boundary 부재

- 앱 전체에 Error Boundary가 없음
- 쿼리 실패나 런타임 에러 시 앱 전체가 빈 화면으로 전환됨

## 2. 추상화 개선점

### 2.1 인라인 타입 반복 → 기존 인터페이스 활용

- `src/_tosslib/server/types.ts`에 `Room`, `Reservation`, `Equipment` 인터페이스가 이미 정의되어 있음
- 그런데 `src/pages/remotes.ts`와 페이지 컴포넌트에서 동일한 타입을 인라인으로 반복 선언하고 있음
  - 예: `(r: { roomId: string; date: string; start: string; end: string })` — `Reservation`과 동일
- 가독성 저하, 중복, 변경 시 누락 위험
- 개선: `remotes.ts`의 API 반환 타입에 `Room[]`, `Reservation[]`을 지정하고, 페이지 컴포넌트에서는 명시적 인터페이스 참조로 교체

### 2.2 useQuery/useMutation → 커스텀 훅 분리

- 현재: 페이지 컴포넌트 내부에서 직접 `useQuery`, `useMutation` 호출
- 제안: `src/queries/` 폴더를 만들어 커스텀 훅으로 분리
  - 예: `useRooms()`, `useReservations(date)`, `useCreateReservation()`, `useCancelReservation()`

### 2.3 상수/유틸 함수 중복 → 공통 모듈 추출

두 페이지에 동일한 코드가 중복:

| 중복 항목 | 위치 |
|-----------|------|
| `EQUIPMENT_LABELS` | 양쪽 페이지 |
| `TIME_SLOTS` 생성 로직 | 양쪽 페이지 |
| `formatDate()` 함수 | 양쪽 페이지 |
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

### 2.7 쿼리 키 매직 스트링

- `['rooms']`, `['reservations', date]`, `['myReservations']`가 두 파일에 흩어져 있음
- 한쪽만 변경 시 캐시 불일치 발생
- 제안: `src/queries/queryKeys.ts`에 상수로 중앙 관리

## 3. 코드 컨벤션 개선점

### 3.1 import 순서 통일

현재 두 페이지의 import 순서가 불일치:

- `RoomBookingPage`: emotion → react-query → tosslib → axios → remotes → types → react → react-router
- `ReservationStatusPage`: emotion → react → react-router → react-query → tosslib → remotes → types

제안 순서:

1. React / React 훅
2. 서드파티 라이브러리 (react-router, react-query, axios, emotion)
3. 내부 라이브러리 (_tosslib)
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
