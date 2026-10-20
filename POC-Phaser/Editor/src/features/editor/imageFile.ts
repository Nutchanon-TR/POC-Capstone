export async function readImageFile(file: File, maxBytes: number, types: string[]) {
  if (!types.includes(file.type)) throw Error('เลือกชนิดภาพที่รองรับ');
  if (file.size > maxBytes) throw Error(`ไฟล์ต้องไม่เกิน ${maxBytes / 1024 / 1024} MB`);
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(Error('อ่านภาพไม่สำเร็จ'));
    reader.onerror = () => reject(Error('อ่านภาพไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = url;
  await image.decode();
  if (
    !image.naturalWidth ||
    !image.naturalHeight ||
    image.naturalWidth > 8192 ||
    image.naturalHeight > 8192
  )
    throw Error('ภาพต้องมีขนาดไม่เกิน 8192 × 8192');
  return { url, width: image.naturalWidth, height: image.naturalHeight };
}
