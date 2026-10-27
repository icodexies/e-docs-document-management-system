/**
 * Turn an uploaded signature photo into a transparent, trimmed PNG so it can
 * sit on top of a PDF without a white box covering the document.
 */

export function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Couldn't prepare the signature image."));
    }, type);
  });
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall back to an <img> for formats createImageBitmap can't decode.
    }
  }

  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image."));
    };
    image.src = url;
  });
}

export async function prepareSignatureImage(file) {
  const bitmap = await loadBitmap(file);
  const sourceWidth = bitmap.width || bitmap.naturalWidth || 0;
  const sourceHeight = bitmap.height || bitmap.naturalHeight || 0;
  if (!sourceWidth || !sourceHeight) throw new Error("That image is empty.");

  const maxWidth = 1600;
  const maxHeight = 800;
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser can't prepare the signature image.");

  context.drawImage(bitmap, 0, 0, width, height);
  if (typeof bitmap.close === "function") bitmap.close();

  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    if (luminance >= 238) {
      data[index + 3] = 0;
    } else if (luminance >= 205) {
      data[index + 3] = Math.round(data[index + 3] * ((238 - luminance) / 33));
    }
  }
  context.putImageData(imageData, 0, 0);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("The signature image looks blank. Try a clearer image.");
  }

  const padding = 8;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropWidth = Math.min(width - cropX, maxX - minX + padding * 2);
  const cropHeight = Math.min(height - cropY, maxY - minY + padding * 2);

  const cropped = document.createElement("canvas");
  cropped.width = cropWidth;
  cropped.height = cropHeight;
  const croppedContext = cropped.getContext("2d");
  if (!croppedContext) throw new Error("This browser can't prepare the signature image.");
  croppedContext.drawImage(
    canvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  const blob = await canvasToBlob(cropped);
  return { blob, width: cropWidth, height: cropHeight };
}
