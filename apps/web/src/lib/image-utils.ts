/**
 * Utility for image processing, including watermarking
 */

export async function applyWatermark(file: File, logoUrl: string = '/logo.png'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Load logo
        const logo = new Image();
        logo.src = logoUrl;
        logo.onload = () => {
          // Watermark settings
          const watermarkMargin = 20;
          const watermarkHeight = canvas.height * 0.05; // 5% of height
          const aspectRatio = logo.width / logo.height;
          const watermarkWidth = watermarkHeight * aspectRatio;

          // Draw logo at bottom left
          ctx.globalAlpha = 0.7; // Subtle transparency
          ctx.drawImage(
            logo,
            watermarkMargin,
            canvas.height - watermarkHeight - watermarkMargin,
            watermarkWidth,
            watermarkHeight
          );
          ctx.globalAlpha = 1.0;

          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        logo.onerror = () => {
          // If logo fails to load, just return original image
          resolve(img.src);
        };
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
