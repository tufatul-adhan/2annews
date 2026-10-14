const jpegMimeTypes = ['image/jpeg', 'image/pjpeg', 'image/jfif'];

export function normalizeImageMimeType(mimeType: string) {
  return jpegMimeTypes.includes(mimeType.toLowerCase()) ? 'image/jpeg' : mimeType;
}
