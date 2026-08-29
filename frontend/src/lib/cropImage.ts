import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

/** Renders the user's crop selection onto a canvas and returns it as a File,
 * ready to attach to the course-image form field. */
export async function getCroppedImageFile(
  imageSrc: string,
  cropPixels: Area,
  fileName: string,
  mimeType = "image/jpeg"
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context.");

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
  if (!blob) throw new Error("Could not create image from crop.");

  return new File([blob], fileName, { type: mimeType });
}
