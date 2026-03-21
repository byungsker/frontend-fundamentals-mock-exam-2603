import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, afterEach, vi } from 'vitest';
import App from './App';
import * as remotes from 'pages/remotes';

describe('예약 현황 심화', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderApp(route = '/') {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    );
  }

  async function waitForPageLoad() {
    await screen.findByText('예약 현황');
  }

  test('타임라인 예약 블록 클릭 시 상세 정보 팝오버가 표시된다', async () => {
    renderApp();
    await waitForPageLoad();

    const dateInput = screen.getByLabelText('날짜');
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2026-03-10');

    const reservationBlock = await screen.findByLabelText('토스홀 A 09:00-10:00 예약 상세');
    await userEvent.click(reservationBlock);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('09:00 ~ 10:00');
    expect(tooltip).toHaveTextContent('5명');
    expect(tooltip).toHaveTextContent('TV');
  });
});

describe('예약하기 심화', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderApp(route = '/booking') {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    );
  }

  async function waitForPageLoad() {
    await screen.findByText('예약 조건');
  }

  test('장비 필터를 선택하면 해당 장비를 갖춘 회의실만 표시된다', async () => {
    renderApp();
    await waitForPageLoad();

    await userEvent.selectOptions(screen.getByLabelText('시작 시간'), '11:30');
    await userEvent.selectOptions(screen.getByLabelText('종료 시간'), '12:30');

    await userEvent.click(screen.getByLabelText('화상장비'));

    await screen.findByText('예약 가능 회의실');

    await screen.findByLabelText('토스홀 A');
    await screen.findByLabelText('미팅룸 501');
    await screen.findByLabelText('대회의실');
    await screen.findByLabelText('미팅룸 701');
  });

  test('선호 층을 선택하면 해당 층의 회의실만 표시된다', async () => {
    renderApp();
    await waitForPageLoad();

    await userEvent.selectOptions(screen.getByLabelText('시작 시간'), '11:30');
    await userEvent.selectOptions(screen.getByLabelText('종료 시간'), '12:30');
    await userEvent.selectOptions(screen.getByLabelText('선호 층'), '7');

    await screen.findByText('예약 가능 회의실');

    await screen.findByLabelText('대회의실');
    await screen.findByLabelText('미팅룸 701');
    await screen.findByLabelText('미팅룸 702');
  });

  test('예약 성공 후 예약 현황이 갱신된다', async () => {
    const spyGetReservations = vi.spyOn(remotes, 'getReservations');

    renderApp();
    await waitForPageLoad();

    await userEvent.selectOptions(screen.getByLabelText('시작 시간'), '17:00');
    await userEvent.selectOptions(screen.getByLabelText('종료 시간'), '18:00');

    await screen.findByText('예약 가능 회의실');

    const roomButton = await screen.findByLabelText('토스홀 A');
    await userEvent.click(roomButton);

    await userEvent.click(screen.getByRole('button', { name: '확정' }));

    // 예약 성공 후 예약 현황 페이지로 이동
    await screen.findByText('예약이 완료되었습니다!');
    await screen.findByText('예약 현황');

    await waitFor(() => expect(spyGetReservations.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  test('전체 플로우: 조건 입력 → 회의실 선택 → 예약', async () => {
    renderApp();
    await waitForPageLoad();

    await userEvent.selectOptions(screen.getByLabelText('시작 시간'), '17:00');
    await userEvent.selectOptions(screen.getByLabelText('종료 시간'), '18:00');

    await screen.findByText('예약 가능 회의실');

    const roomButton = await screen.findByLabelText('토스홀 A');
    await userEvent.click(roomButton);
    expect(await screen.findByText('선택됨')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '확정' }));
    // 예약 성공 후 예약 현황 페이지로 이동
    await screen.findByText('예약이 완료되었습니다!');
  });

  test('예약 가능 회의실이 층수 → 이름순으로 정렬된다', async () => {
    renderApp();
    await waitForPageLoad();

    await userEvent.selectOptions(screen.getByLabelText('시작 시간'), '11:30');
    await userEvent.selectOptions(screen.getByLabelText('종료 시간'), '12:30');

    await screen.findByText('예약 가능 회의실');

    const roomButtons = screen
      .getAllByRole('button', { pressed: false })
      .filter(
        el =>
          el.getAttribute('aria-label') &&
          !['확정', '예약하기', '취소', 'TV', '화이트보드', '화상장비', '스피커', '뒤로가기'].includes(
            el.getAttribute('aria-label')!
          )
      );
    const roomNames = roomButtons.map(el => el.getAttribute('aria-label'));

    const floorOrder = roomNames.map(name => {
      if (name?.includes('토스홀') || name?.includes('301')) return 3;
      if (name?.includes('501') || name?.includes('502')) return 5;
      if (name?.includes('대회의실') || name?.includes('701') || name?.includes('702')) return 7;
      return 0;
    });

    for (let i = 1; i < floorOrder.length; i++) {
      expect(floorOrder[i]).toBeGreaterThanOrEqual(floorOrder[i - 1]);
    }
  });
});
