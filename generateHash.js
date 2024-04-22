import crypto from 'crypto';

// Functio

// Function to generate a hash for an entry using only specific fields
export function generateHash(entry) {
    const relevantData = {
      prompt: entry.prompt,
      source: entry.source,
      maturity: entry.maturity,
      description: entry.description,
      transcript: entry.transcript
    };
    return crypto.createHash('sha256').update(JSON.stringify(relevantData)).digest('hex');
  }