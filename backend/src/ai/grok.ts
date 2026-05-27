import Groq from "groq-sdk";
import 'dotenv/config'

export const grok = new Groq({
  apiKey: process.env.GROK_API_KEY});