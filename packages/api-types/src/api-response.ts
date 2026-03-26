export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export function isApiSuccess<T>(payload: ApiResponse<T>): boolean {
  return payload.success === true;
}
