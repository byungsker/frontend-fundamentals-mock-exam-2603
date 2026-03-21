import { rest } from 'msw';
import { v4 as uuidv4 } from 'uuid';
import { rooms, reservations as initialReservations, myReservations as initialMyReservations } from './data/rooms';
import { Reservation } from './types';

let reservations = [...initialReservations];
let myReservations = [...initialMyReservations];

export function resetData() {
  reservations = [...initialReservations];
  myReservations = [...initialMyReservations];
}

export function handlers() {
  resetData();

  return [
    rest.get('/api/rooms', getRooms),
    rest.get('/api/reservations', getReservations),
    rest.post('/api/reservations', postReservation),
    rest.get('/api/my-reservations', getMyReservations),
    rest.delete('/api/reservations/:id', deleteReservation),
  ];
}

const getRooms: Parameters<typeof rest.get>[1] = (_, res, ctx) => {
  return res(ctx.status(200), ctx.json(rooms));
};

const getReservations: Parameters<typeof rest.get>[1] = (req, res, ctx) => {
  const date = req.url.searchParams.get('date');
  if (!date) {
    return res(ctx.status(400), ctx.json({ message: 'date parameter is required' }));
  }
  const filtered = reservations.filter(r => r.date === date);
  return res(ctx.status(200), ctx.json(filtered));
};

const postReservation: Parameters<typeof rest.post>[1] = (req, res, ctx) => {
  const body = req.body as any;
  const { roomId, date, start, end, attendees, equipment } = body?.data ?? body ?? {};

  const room = rooms.find(r => r.id === roomId);
  if (!room) {
    return res(ctx.status(404), ctx.json({ ok: false, code: 'NOT_FOUND', message: '회의실을 찾을 수 없습니다.' }));
  }

  if (!start || !end || start >= end) {
    return res(ctx.status(400), ctx.json({ ok: false, code: 'INVALID', message: '유효하지 않은 시간입니다.' }));
  }

  const hasConflict = reservations.some(r => r.roomId === roomId && r.date === date && r.start < end && r.end > start);
  if (hasConflict) {
    return res(
      ctx.status(409),
      ctx.json({ ok: false, code: 'CONFLICT', message: '해당 시간에 이미 예약이 있습니다.' })
    );
  }

  const newReservation: Reservation = {
    id: uuidv4(),
    roomId,
    date,
    start,
    end,
    attendees,
    equipment: equipment || [],
  };

  reservations.push(newReservation);
  myReservations.push(newReservation);

  return res(ctx.status(200), ctx.json({ ok: true, reservation: newReservation }));
};

const getMyReservations: Parameters<typeof rest.get>[1] = (_, res, ctx) => {
  return res(ctx.status(200), ctx.json(myReservations));
};

const deleteReservation: Parameters<typeof rest.delete>[1] = (req, res, ctx) => {
  const { id } = req.params;
  const index = reservations.findIndex(r => r.id === id);
  if (index === -1) {
    return res(ctx.status(404), ctx.json({ ok: false }));
  }
  reservations.splice(index, 1);
  myReservations = myReservations.filter(r => r.id !== id);
  return res(ctx.status(200), ctx.json({ ok: true }));
};
