import 'dotenv/config';
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const model = openrouter('openai/gpt-4o');

async function main() {
  const { text } = await generateText({
    model,
    prompt: 'Write a vegetarian lasagna recipe for 4 people.',
  });
  console.log(text);
}

main();
