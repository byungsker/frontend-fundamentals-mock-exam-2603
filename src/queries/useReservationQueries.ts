import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelReservation, createReservation, getMyReservations, getReservations, getRooms } from 'api/remotes';
import { Reservation } from '_tosslib/server/types';
import { queryKeys } from './queryKeys';

export function useRooms() {
  return useQuery(queryKeys.rooms, getRooms);
}

export function useReservations(date: string) {
  return useQuery(queryKeys.reservations(date), () => getReservations(date), {
    enabled: !!date,
  });
}

export function useMyReservations() {
  return useQuery(queryKeys.myReservations, getMyReservations);
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation((data: Omit<Reservation, 'id'>) => createReservation(data), {
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries(queryKeys.reservations(variables.date));
      queryClient.invalidateQueries(queryKeys.myReservations);
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation((id: string) => cancelReservation(id), {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.rooms);
      queryClient.invalidateQueries(queryKeys.myReservations);
    },
  });
}
