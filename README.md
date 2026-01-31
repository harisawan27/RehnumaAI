# RehnumaAI

An AI-powered study tool built with Next.js and Google Gemini, using Firebase for authentication and database.

## Features

- AI-Powered Chat with multiple agent personas (Study Guide, Ethics Mentor, Life Coach, etc.)
- Document Upload & AI Explanations
- Practice Question Generation
- Summary Generation
- Real-time chat with streaming responses
- File and image attachments
- User Authentication (Email/Password)

## Tech Stack

- **Frontend**: Next.js 15, React 18, Tailwind CSS, Radix UI
- **Backend**: Firebase (Auth, Firestore, Storage)
- **AI**: Google Gemini 2.5 Flash

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Auth, Firestore, and Storage enabled
- Google Gemini API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. Push your code to GitHub
2. Connect the repository to Vercel
3. Add the `GEMINI_API_KEY` environment variable in Vercel project settings
4. Deploy

## Firebase Configuration

The Firebase configuration is in `src/firebase/config.ts`. Update it if you want to use your own Firebase project.

## Firestore Security Rules

If using your own Firebase project, deploy the security rules from `firestore.rules` to your Firebase console.
