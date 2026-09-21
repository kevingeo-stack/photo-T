export class BlobUrlManager {
  /**
   * Creates a temporary Object URL for presentation purposes.
   * Callers MUST call revokeUrl when the component unmounts or the URL is no longer needed.
   */
  public static createUrl(blob: Blob | MediaSource): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Revokes a previously created Object URL to free up memory.
   */
  public static revokeUrl(url: string | undefined | null): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}
