import { Room, Reservation } from '../types';

export const rooms: Room[] = [
  { id: 'room-1', name: '토스홀 A', floor: 3, capacity: 10, equipment: ['tv', 'whiteboard', 'video', 'speaker'] },
  { id: 'room-2', name: '토스홀 B', floor: 3, capacity: 6, equipment: ['tv', 'whiteboard'] },
  { id: 'room-3', name: '미팅룸 301', floor: 3, capacity: 4, equipment: ['whiteboard'] },
  { id: 'room-4', name: '미팅룸 501', floor: 5, capacity: 8, equipment: ['tv', 'video', 'speaker'] },
  { id: 'room-5', name: '미팅룸 502', floor: 5, capacity: 4, equipment: ['tv'] },
  { id: 'room-6', name: '대회의실', floor: 7, capacity: 20, equipment: ['tv', 'whiteboard', 'video', 'speaker'] },
  { id: 'room-7', name: '미팅룸 701', floor: 7, capacity: 6, equipment: ['tv', 'whiteboard', 'video'] },
  { id: 'room-8', name: '미팅룸 702', floor: 7, capacity: 3, equipment: ['whiteboard'] },
];

export const reservations: Reservation[] = [
  { id: 'res-1', roomId: 'room-1', date: '2026-03-10', start: '09:00', end: '10:00', attendees: 5, equipment: ['tv'] },
  {
    id: 'res-2',
    roomId: 'room-1',
    date: '2026-03-10',
    start: '14:00',
    end: '15:30',
    attendees: 8,
    equipment: ['tv', 'video'],
  },
  {
    id: 'res-3',
    roomId: 'room-2',
    date: '2026-03-10',
    start: '10:00',
    end: '11:30',
    attendees: 4,
    equipment: ['whiteboard'],
  },
  {
    id: 'res-4',
    roomId: 'room-4',
    date: '2026-03-10',
    start: '13:00',
    end: '14:00',
    attendees: 6,
    equipment: ['tv', 'speaker'],
  },
  {
    id: 'res-5',
    roomId: 'room-6',
    date: '2026-03-10',
    start: '09:30',
    end: '11:00',
    attendees: 15,
    equipment: ['tv', 'video', 'speaker'],
  },
  {
    id: 'res-6',
    roomId: 'room-7',
    date: '2026-03-10',
    start: '15:00',
    end: '16:30',
    attendees: 5,
    equipment: ['tv', 'whiteboard'],
  },
];

export const myReservations: Reservation[] = [
  { id: 'res-1', roomId: 'room-1', date: '2026-03-10', start: '09:00', end: '10:00', attendees: 5, equipment: ['tv'] },
  {
    id: 'res-4',
    roomId: 'room-4',
    date: '2026-03-10',
    start: '13:00',
    end: '14:00',
    attendees: 6,
    equipment: ['tv', 'speaker'],
  },
];
