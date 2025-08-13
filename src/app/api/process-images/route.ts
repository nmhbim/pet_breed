import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { imageData, colors, breedName } = await request.json();

    if (!imageData || !colors || !breedName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const results = [];

    for (const color of colors) {
      try {
        // Convert base64 to buffer
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Create a new image with the specified color
        const processedImage = await sharp(imageBuffer)
          .tint({ r: getColorRGB(color).r, g: getColorRGB(color).g, b: getColorRGB(color).b })
          .png()
          .toBuffer();

        // Generate filename
        const fileName = `${breedName.toLowerCase().replace(/\s+/g, '_')}_${color.toLowerCase().replace(/\s+/g, '_')}.png`;

        // Convert back to base64 for response
        const processedBase64 = `data:image/png;base64,${processedImage.toString('base64')}`;

        results.push({
          color,
          fileName,
          imageData: processedBase64
        });
      } catch (error) {
        console.error(`Error processing color ${color}:`, error);
        results.push({
          color,
          error: `Failed to process ${color}`
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error processing images:', error);
    return NextResponse.json({ error: 'Failed to process images' }, { status: 500 });
  }
}

// Helper function to convert color names to RGB values
function getColorRGB(colorName: string) {
  const colorMap: { [key: string]: { r: number, g: number, b: number } } = {
    'black': { r: 0, g: 0, b: 0 },
    'white': { r: 255, g: 255, b: 255 },
    'brown': { r: 139, g: 69, b: 19 },
    'golden': { r: 255, g: 215, b: 0 },
    'cream': { r: 255, g: 253, b: 208 },
    'red': { r: 255, g: 0, b: 0 },
    'gray': { r: 128, g: 128, b: 128 },
    'blue': { r: 0, g: 0, b: 255 },
    'yellow': { r: 255, g: 255, b: 0 },
    'orange': { r: 255, g: 165, b: 0 },
    'pink': { r: 255, g: 192, b: 203 },
    'purple': { r: 128, g: 0, b: 128 },
    'green': { r: 0, g: 128, b: 0 },
    'tan': { r: 210, g: 180, b: 140 },
    'fawn': { r: 229, g: 170, b: 112 },
    'brindle': { r: 139, g: 69, b: 19 },
    'merle': { r: 128, g: 128, b: 128 },
    'sable': { r: 139, g: 69, b: 19 },
    'tricolor': { r: 139, g: 69, b: 19 },
    'bicolor': { r: 139, g: 69, b: 19 }
  };

  const normalizedColor = colorName.toLowerCase().trim();
  return colorMap[normalizedColor] || { r: 128, g: 128, b: 128 }; // Default to gray if color not found
}
