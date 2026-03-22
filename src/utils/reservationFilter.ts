import { Room, Reservation } from '_tosslib/server/types';

export function hasTimeConflict(
  room: Room,
  reservations: Reservation[],
  date: string,
  startTime: string,
  endTime: string
): boolean {
  return reservations.some(
    (r: Reservation) => r.roomId === room.id && r.date === date && r.start < endTime && r.end > startTime
  );
}

export function byFloorThenName(a: Room, b: Room): number {
  if (a.floor !== b.floor) return a.floor - b.floor;
  return a.name.localeCompare(b.name);
}

export function validateBookingInput(
  startTime: string,
  endTime: string,
  attendees: number
): { valid: boolean; error?: string } {
  if (!startTime || !endTime) return { valid: false };
  if (endTime <= startTime) return { valid: false, error: '종료 시간은 시작 시간보다 늦어야 합니다.' };
  if (attendees < 1) return { valid: false, error: '참석 인원은 1명 이상이어야 합니다.' };
  return { valid: true };
}
