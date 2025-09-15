import { LlamaContext } from 'llama.rn';

export interface AINameSuggestions {
  recordingTitles: string[];
  folderNames: string[];
  summary: string;
}

export class AINamingService {
  private llamaContext: LlamaContext;

  constructor(llamaContext: LlamaContext) {
    this.llamaContext = llamaContext;
  }

  /**
   * Generate smart recording titles based on transcript content
   */
  async generateRecordingTitles(transcript: string): Promise<string[]> {
    if (!transcript.trim()) {
      return ['Untitled Recording'];
    }

    // Truncate transcript if too long (keep first 1000 chars for context)
    const truncatedTranscript =
      transcript.length > 1000 ? transcript.substring(0, 1000) + '...' : transcript;

    const prompt = `Based on this lecture transcript, suggest 3 concise, descriptive titles (max 50 characters each):

Transcript: "${truncatedTranscript}"

Generate exactly 3 titles that capture the main topic. Format as a simple list:
1. Title One
2. Title Two  
3. Title Three`;

    try {
      const result = await this.llamaContext.completion({
        prompt,
        n_predict: 200,
        temperature: 0.7,
        stop: ['\n\n', 'Note:', 'Additional'],
      });

      const titles = this.parseTitlesFromResponse(result.content);
      return titles.length > 0 ? titles : this.generateFallbackTitles(transcript);
    } catch (error) {
      console.error('Error generating recording titles:', error);
      return this.generateFallbackTitles(transcript);
    }
  }

  /**
   * Generate folder names for organizing recordings
   */
  async generateFolderNames(transcripts: string[]): Promise<string[]> {
    if (transcripts.length === 0) {
      return ['Lectures'];
    }

    // Create a summary of all transcripts
    const combinedContent = transcripts
      .map((t) => t.substring(0, 300)) // First 300 chars of each
      .join('\n\n')
      .substring(0, 1500); // Limit total content

    const prompt = `Based on these lecture transcripts, suggest 3 folder names to organize these recordings:

Content: "${combinedContent}"

Generate 3 short folder names (max 30 characters each) that categorize these lectures:
1. Folder One
2. Folder Two
3. Folder Three`;

    try {
      const result = await this.llamaContext.completion({
        prompt,
        n_predict: 150,
        temperature: 0.6,
        stop: ['\n\n', 'Note:', 'Additional'],
      });

      const folderNames = this.parseTitlesFromResponse(result.content);
      return folderNames.length > 0 ? folderNames : this.generateFallbackFolders();
    } catch (error) {
      console.error('Error generating folder names:', error);
      return this.generateFallbackFolders();
    }
  }

  /**
   * Generate a summary of the recording content
   */
  async generateSummary(transcript: string): Promise<string> {
    if (!transcript.trim()) {
      return 'No content to summarize.';
    }

    // Truncate if too long
    const truncatedTranscript =
      transcript.length > 2000 ? transcript.substring(0, 2000) + '...' : transcript;

    const prompt = `Summarize this lecture transcript in 2-3 clear sentences:

Transcript: "${truncatedTranscript}"

Summary:`;

    try {
      const result = await this.llamaContext.completion({
        prompt,
        n_predict: 150,
        temperature: 0.3,
        stop: ['\n\n', 'Note:', 'Transcript:'],
      });

      const summary = result.content.trim();
      return summary || 'Unable to generate summary.';
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Summary generation failed.';
    }
  }

  /**
   * Generate smart title suggestions for existing recordings based on transcript analysis
   */
  async suggestBetterTitle(currentTitle: string, transcript: string): Promise<string[]> {
    if (!transcript.trim()) {
      return [currentTitle];
    }

    const truncatedTranscript = transcript.substring(0, 1000);

    const prompt = `Current title: "${currentTitle}"
Transcript: "${truncatedTranscript}"

Suggest 2 better titles that are more descriptive than the current one:
1. Better Title One
2. Better Title Two`;

    try {
      const result = await this.llamaContext.completion({
        prompt,
        n_predict: 100,
        temperature: 0.6,
        stop: ['\n\n'],
      });

      const titles = this.parseTitlesFromResponse(result.content);
      return titles.length > 0 ? titles : [currentTitle];
    } catch (error) {
      console.error('Error suggesting better title:', error);
      return [currentTitle];
    }
  }

  // Helper methods
  private parseTitlesFromResponse(response: string): string[] {
    const lines = response.split('\n').filter((line) => line.trim());
    const titles: string[] = [];

    for (const line of lines) {
      // Match numbered list items like "1. Title" or "- Title"
      const match = line.match(/^\d+\.\s*(.+)|^-\s*(.+)|^•\s*(.+)/);
      if (match) {
        const title = (match[1] || match[2] || match[3]).trim();
        if (title && title.length <= 50) {
          titles.push(title);
        }
      }
    }

    return titles.slice(0, 3); // Maximum 3 titles
  }

  private generateFallbackTitles(transcript: string): string[] {
    const words = transcript.split(' ').slice(0, 10);
    const date = new Date().toLocaleDateString();

    if (words.length < 3) {
      return [`Recording ${date}`, 'Lecture Notes', 'Study Session'];
    }

    // Extract meaningful words (skip common words)
    const meaningfulWords = words.filter(
      (word) =>
        word.length > 3 &&
        ![
          'the',
          'and',
          'for',
          'are',
          'but',
          'not',
          'you',
          'all',
          'can',
          'her',
          'was',
          'one',
          'our',
          'had',
          'but',
        ].includes(word.toLowerCase())
    );

    if (meaningfulWords.length >= 2) {
      const title = meaningfulWords.slice(0, 3).join(' ');
      return [title, `${title} - ${date}`, `Lecture: ${title}`];
    }

    return [`Recording ${date}`, 'Lecture Notes', 'Study Session'];
  }

  private generateFallbackFolders(): string[] {
    return ['Lectures', 'Study Notes', 'Course Materials'];
  }
}

/**
 * Hook to use AI naming service with current Llama context
 */
export const useAINaming = (llamaContext: LlamaContext | null) => {
  if (!llamaContext) {
    return null;
  }

  return new AINamingService(llamaContext);
};
