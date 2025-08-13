import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Get API key from environment
    const envApiKey = process.env.OPENAI_API_KEY || '';
    
    return NextResponse.json({ 
      apiKey: envApiKey,
      hasEnvKey: !!envApiKey 
    });
  } catch (error) {
    console.error('Error getting config:', error);
    return NextResponse.json({ 
      apiKey: '',
      hasEnvKey: false 
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Path to .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    
    // Content for .env.local
    const envContent = `# OpenAI API Configuration
OPENAI_API_KEY=${apiKey}

# This file was automatically generated
# You can edit this file manually if needed
`;

    try {
      // Write to .env.local file
      await fs.writeFile(envPath, envContent, 'utf8');
      
      // Update process.env for immediate effect (optional)
      process.env.OPENAI_API_KEY = apiKey;
      
      return NextResponse.json({ 
        success: true, 
        message: 'API key saved to .env.local successfully' 
      });
    } catch (writeError) {
      console.error('Error writing .env.local:', writeError);
      return NextResponse.json({ 
        error: 'Failed to write .env.local file',
        details: writeError instanceof Error ? writeError.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json({ 
      error: 'Failed to save API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
