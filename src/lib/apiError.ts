// Kelas error bersama untuk apiClient.ts (jalur network sungguhan) dan
// mockBackend.ts (jalur demo). Dipisah ke modul sendiri supaya keduanya bisa
// saling mengimpor tanpa membentuk circular import (apiClient <-> mockBackend).
export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}
