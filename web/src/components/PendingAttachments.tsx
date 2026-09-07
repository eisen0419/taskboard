export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

export function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}
