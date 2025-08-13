import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { imageData, fileName, breedName, originalFolderPath } = await request.json();

    if (!imageData || !fileName || !breedName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Always save to public/generated for web access
    const outputDir = path.join(process.cwd(), 'public', 'generated', breedName.toLowerCase().replace(/\s+/g, '_'));
    
    console.log('Saving image to directory:', outputDir);
    console.log('File name:', fileName);
    
    await fs.mkdir(outputDir, { recursive: true });

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Save image to file
    const filePath = path.join(outputDir, fileName);
    console.log('Full file path:', filePath);
    await fs.writeFile(filePath, imageBuffer);
    console.log('Image saved successfully!');

    return NextResponse.json({
      success: true,
      filePath: `/generated/${breedName.toLowerCase().replace(/\s+/g, '_')}/${fileName}`,
      message: `Image saved successfully: ${fileName}`
    });

  } catch (error) {
    console.error('Error saving image:', error);
    return NextResponse.json({ 
      error: 'Failed to save image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
