import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { breedName, apiKey } = await request.json();

    if (!breedName) {
      return NextResponse.json({ error: 'Breed name is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const prompt = `What are the common coat colors and patterns for ${breedName} dogs? Please provide a list of specific color names in English, separated by commas. Only return the color names, nothing else. For example: "Golden, Cream, White, Black, Brown"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const colors = completion.choices[0]?.message?.content?.trim() || '';
    
    // Parse colors from response
    const colorList = colors.split(',').map(color => color.trim()).filter(color => color.length > 0);

    return NextResponse.json({ colors: colorList });
  } catch (error) {
    console.error('Error calling ChatGPT:', error);
    return NextResponse.json({ error: 'Failed to get colors from ChatGPT' }, { status: 500 });
  }
}
