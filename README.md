# 🐕 Dog Color Variant Generator

A Next.js application that generates color variants of dog breed images using AI.

## Features

- 📁 Upload folders containing dog breed images
- 🤖 AI-powered color detection using ChatGPT
- 🎨 OpenAI GPT-Image-1 generation for color variants
- 📱 Modern, responsive UI
- ⚡ Real-time processing status
- 🔄 Individual color processing with progress tracking

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup OpenAI API Key (Optional):**
   
   **Option A: Environment Variable (Recommended)**
   Create a `.env.local` file in the root directory:
   ```bash
   # .env.local
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   
   **Option B: Web Interface**
   You can also enter your API key directly in the web application. The app will auto-load from environment if available, but you can override it anytime.

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How to Use

1. **Prepare your folder structure:**
   ```
   B/
   ├── golden_retriever/
   │   └── golden_retriever.png
   ├── german_shepherd/
   │   └── german_shepherd.png
   └── husky/
       └── husky.png
   ```

2. **Enter your OpenAI API key** in the application

3. **Upload your folder** using the file picker

4. **Wait for processing** - the AI will:
   - Detect dog breeds from folder names
   - Query ChatGPT for common colors of each breed
   - Generate color variants using OpenAI GPT-Image-1 for each color

5. **Download the results** - generated images will be saved with the format:
   ```
   breedname_color.png
   ```

## Folder Structure Requirements

- Create a main folder (e.g., "B") containing breed subfolders
- Each subfolder should be named after a dog breed
- Each subfolder should contain exactly one image file
- Supported image formats: JPG, JPEG, PNG, GIF, WEBP
- Use English breed names for best AI recognition

## Technologies Used

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **OpenAI API** - AI color detection
- **Sharp** - Image processing

## API Endpoints

- `POST /api/chatgpt` - Get dog breed colors from ChatGPT
- `POST /api/generate-image` - Generate color variants using OpenAI GPT-Image-1

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## License

MIT
