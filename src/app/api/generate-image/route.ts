import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { referenceImageData, breedName, animalType, color, apiKey, customPrompt } = await request.json();

    if (!referenceImageData || !breedName || !animalType || !color || !apiKey) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Use custom prompt if provided, otherwise use default
    const defaultPrompt = `Create an image of a ${breedName} ${animalType} with ${color} fur. The new image must match the exact same artistic style, cartoon design, pose, proportions, and visual characteristics as the reference image. Only change the fur color to ${color}, keeping everything else identical including the drawing style, line work, shading, and overall appearance. The image must have a completely transparent background, no background elements at all, just the ${animalType} with the same style as the reference. Make sure the background is 100% transparent.`;
    
    const prompt = customPrompt 
      ? customPrompt.replace(/{animalType}/g, animalType).replace(/{breedName}/g, breedName).replace(/{color}/g, color)
      : defaultPrompt;

    // Convert base64 to Buffer and create a File using toFile
    const base64Data = referenceImageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Create a File using toFile from OpenAI SDK
    const imageFile = await toFile(imageBuffer, null, {
      type: "image/png",
    });

    // Call GPT-Image-1 API to edit image with reference
    const response = await openai.images.edit({
      model: "gpt-image-1",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      image: imageFile,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image generated');
    }

    const generatedImage = response.data[0];
    
    // GPT-Image-1 returns b64_json directly
    if (!generatedImage.b64_json) {
      throw new Error('No image data returned from GPT-Image-1');
    }
    
    // Convert b64_json to data URL
    const imageDataUrl = `data:image/png;base64,${generatedImage.b64_json}`;

    // Generate filename
    const fileName = `${breedName.toLowerCase().replace(/\s+/g, '_')}_${color.toLowerCase().replace(/\s+/g, '_')}.png`;

    return NextResponse.json({
      fileName,
      imageData: imageDataUrl,
      prompt: prompt
    });

  } catch (error) {
    console.error('Error generating image:', error);
    
    // Check if it's an organization verification error
    if (error instanceof Error && error.message.includes('organization must be verified')) {
      return NextResponse.json({ 
        error: 'Organization verification required',
        details: 'Your OpenAI organization needs to be verified to use GPT-Image-1. Please visit: https://platform.openai.com/settings/organization/general',
        code: 'ORG_VERIFICATION_REQUIRED'
      }, { status: 403 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
