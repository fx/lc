export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; status: number } }

export function ok<T>(data: T): Result<T> {
  return { success: true, data }
}

export function err<T>(code: string, message: string, status: number): Result<T> {
  return { success: false, error: { code, message, status } }
}
