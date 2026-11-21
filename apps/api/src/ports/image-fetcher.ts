export interface ImageFetcher {
  fetch(
    this: void,
    sourceUrl: string,
  ): Promise<{ contentType: string; body: Uint8Array }>;
}
