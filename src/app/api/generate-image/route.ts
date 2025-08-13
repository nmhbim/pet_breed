import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { referenceImageData, breedName, animalType, color, apiKey, customPrompt, isMasterGeneration } = await request.json();

    if (!referenceImageData || !breedName || !animalType || !color || !apiKey) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Use different prompts for master generation vs color variants
    let prompt;
    
    if (isMasterGeneration) {
      // Master generation: Use custom master prompt
      const defaultMasterPrompt = `Create an image of a ${animalType} ${breedName} with ${color} fur. Use the reference image for artistic style, pose, and composition, but make sure the animal is an accurate representation of a ${breedName} breed with proper ${breedName} characteristics (face shape, ear shape, body proportions, etc.). The image should match the same cartoon style, pose, and artistic approach as the reference, but the animal must look like a genuine ${breedName}. Transparent background, no background elements.`;
      
      prompt = customPrompt 
        ? customPrompt.replace(/{animalType}/g, animalType).replace(/{breedName}/g, breedName).replace(/{color}/g, color)
        : defaultMasterPrompt;
    } else {
      // Color variant generation: Use custom variants prompt
      const defaultVariantsPrompt = `Change only the fur color of this ${animalType} ${breedName} to ${color}. Keep everything else EXACTLY the same: same pose, same facial expression, same body position, same artistic style, same proportions. Only the fur color should change from the current color to ${color}. Maintain transparent background.`;
      
      prompt = customPrompt 
        ? customPrompt.replace(/{animalType}/g, animalType).replace(/{breedName}/g, breedName).replace(/{color}/g, color)
        : defaultVariantsPrompt;
    }

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
