import axios from 'axios';

export function getErrorMessage(err: unknown, fallback = '요청에 실패했습니다.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? fallback;
  }
  return fallback;
}
