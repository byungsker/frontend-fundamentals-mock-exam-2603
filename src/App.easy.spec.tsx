import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, afterEach, vi } from 'vitest';
import App from './App';
import * as remotes from 'pages/remotes';

describe('예약 현황 페이지', () => {
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

  test('회의실 목록과 예약 현황을 불러온다', async () => {
    const spyGetRooms = vi.spyOn(remotes, 'getRooms');
    const spyGetReservations = vi.spyOn(remotes, 'getReservations');

    renderApp();

    await waitFor(() => expect(spyGetRooms).toHaveBeenCalled());
    await waitFor(() => expect(spyGetReservations).toHaveBeenCalled());

    await screen.findByText('회의실 예약');
    await screen.findByText('예약 현황');

    const roomNames = await screen.findAllByText('토스홀 A');
    expect(roomNames.length).toBeGreaterThanOrEqual(1);

    expect(screen.getAllByText('미팅룸 501').length).toBeGreaterThanOrEqual(1);
  });

  test('날짜를 변경하면 해당 날짜의 예약 현황을 다시 불러온다', async () => {
    const spyGetReservations = vi.spyOn(remotes, 'getReservations');

    renderApp();
    await waitForPageLoad();

    const dateInput = screen.getByLabelText('날짜');
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2026-03-15');

    await waitFor(() => expect(spyGetReservations).toHaveBeenCalledWith('2026-03-15'));
  });

  test('내 예약 목록이 표시된다', async () => {
    const spyGetMyReservations = vi.spyOn(remotes, 'getMyReservations');

    renderApp();

    await waitFor(() => expect(spyGetMyReservations).toHaveBeenCalled());
    await screen.findByText('내 예약');
  });

  test('예약을 취소하면 확인 후 목록에서 제거된다', async () => {
    const spyCancelReservation = vi.spyOn(remotes, 'cancelReservation');
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderApp();

    await screen.findByText('내 예약');

    const cancelButtons = await screen.findAllByRole('button', { name: '취소' });
    expect(cancelButtons.length).toBeGreaterThan(0);

    await userEvent.click(cancelButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('정말 취소하시겠습니까?');
    await waitFor(() => expect(spyCancelReservation).toHaveBeenCalled());
    await screen.findByText('예약이 취소되었습니다.');
  });

  test('예약 취소 확인 다이얼로그에서 거부하면 취소되지 않는다', async () => {
    const spyCancelReservation = vi.spyOn(remotes, 'cancelReservation');
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderApp();

    await screen.findByText('내 예약');

    const cancelButtons = await screen.findAllByRole('button', { name: '취소' });
    await userEvent.click(cancelButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('정말 취소하시겠습니까?');
    expect(spyCancelReservation).not.toHaveBeenCalled();
  });

  test('예약하기 버튼을 누르면 예약 페이지로 이동한다', async () => {
    renderApp();
    await waitForPageLoad();

    await userEvent.click(screen.getByRole('button', { name: '예약하기' }));

    await screen.findByText('예약 조건');
  });

  test('과거 날짜는 선택할 수 없다', async () => {
    renderApp();
    await waitForPageLoad();

    const dateInput = screen.getByLabelText('날짜') as HTMLInputElement;

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    expect(dateInput.min).toBe(todayStr);
  });
});

describe('예약하기 페이지', () => {
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

  test('예약 조건을 입력하면 예약 가능 회의실 목록이 표시된다', async () => {
    renderApp();
    await waitForPageLoad();

    await userEvent.selectOptions(screen.getByLabelText('시작 시간'), '11:30');
    await userEvent.selectOptions(screen.getByLabelText('종료 시간'), '12:30');

    await screen.findByText('예약 가능 회의실');
  });

  test('종료 시간이 시작 시간보다 빠르면 검증 에러가 표시된다', async () => {
    renderApp();
    await waitForPageLoad();

    await userEvent.selectOptions(screen.getByLabelText('시작 시간'), '14:00');
    await userEvent.selectOptions(screen.getByLabelText('종료 시간'), '10:00');

    await screen.findByText('종료 시간은 시작 시간보다 늦어야 합니다.');
  });

  test('참석 인원으로 회의실을 필터링한다', async () => {
    renderApp();
    await waitForPageLoad();

    await userEvent.selectOptions(screen.getByLabelText('시작 시간'), '11:30');
    await userEvent.selectOptions(screen.getByLabelText('종료 시간'), '12:30');
    const attendeesInput = screen.getByLabelText('참석 인원') as HTMLInputElement;
    await userEvent.clear(attendeesInput);
    await userEvent.tripleClick(attendeesInput);
    await userEvent.keyboard('15');

    await screen.findByText('예약 가능 회의실');

    const roomCard = await screen.findByLabelText('대회의실');
    expect(roomCard).toBeInTheDocument();
  });

  test('회의실을 선택하지 않고 예약하면 에러 메시지가 표시된다', async () => {
    renderApp();
    await waitForPageLoad();

    await userEvent.selectOptions(screen.getByLabelText('시작 시간'), '11:30');
    await userEvent.selectOptions(screen.getByLabelText('종료 시간'), '12:30');

    await screen.findByText('예약 가능 회의실');

    await userEvent.click(screen.getByRole('button', { name: '확정' }));

    await screen.findByText('회의실을 선택해주세요.');
  });

  test('회의실을 선택하고 예약하면 성공 메시지가 표시된다', async () => {
    const spyCreateReservation = vi.spyOn(remotes, 'createReservation');

    renderApp();
    await waitForPageLoad();

    await userEvent.selectOptions(screen.getByLabelText('시작 시간'), '17:00');
    await userEvent.selectOptions(screen.getByLabelText('종료 시간'), '18:00');

    await screen.findByText('예약 가능 회의실');

    const roomButton = await screen.findByLabelText('토스홀 A');
    await userEvent.click(roomButton);

    await userEvent.click(screen.getByRole('button', { name: '확정' }));

    await waitFor(() => expect(spyCreateReservation).toHaveBeenCalled());
    // 예약 성공 후 예약 현황 페이지로 이동하여 성공 메시지 표시
    await screen.findByText('예약이 완료되었습니다!');
  });

  test('필터 조건이 URL 쿼리에 반영된다', async () => {
    renderApp('/booking?startTime=09%3A00&endTime=10%3A00&attendees=5');

    await waitForPageLoad();

    const startSelect = screen.getByLabelText('시작 시간') as HTMLSelectElement;
    const endSelect = screen.getByLabelText('종료 시간') as HTMLSelectElement;
    const attendeesInput = screen.getByLabelText('참석 인원') as HTMLInputElement;

    expect(startSelect.value).toBe('09:00');
    expect(endSelect.value).toBe('10:00');
    expect(attendeesInput.value).toBe('5');
  });

  test('뒤로가기 버튼을 누르면 예약 현황 페이지로 이동한다', async () => {
    renderApp();
    await waitForPageLoad();

    await userEvent.click(screen.getByLabelText('뒤로가기'));

    await screen.findByText('예약 현황');
  });
});
