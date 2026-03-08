import axios from 'axios';
import { OLLAMA_CONFIG } from '../config/ollama-config';

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  eval_count: number;
  eval_duration: number;
}

export class OllamaService {
  private baseUrl: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private timeout: number;

  constructor(
    baseUrl: string = OLLAMA_CONFIG.baseUrl,
    model: string = OLLAMA_CONFIG.model,
    temperature: number = OLLAMA_CONFIG.temperature,
    maxTokens: number = OLLAMA_CONFIG.maxTokens,
    timeout: number = OLLAMA_CONFIG.timeout
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
    this.timeout = timeout;
  }

  /**
   * Send a prompt to Ollama and return the text response.
   */
  async generateResponse(prompt: string): Promise<string> {
    const request: OllamaGenerateRequest = {
      model: this.model,
      prompt,
      stream: false,
      temperature: this.temperature,
      top_p: 0.9,
      num_predict: this.maxTokens,
    };

    try {
      const response = await axios.post<OllamaGenerateResponse>(
        `${this.baseUrl}/api/generate`,
        request,
        { timeout: this.timeout }
      );

      if (!response.data?.response) {
        throw new Error('Ollama returned empty response');
      }

      return response.data.response.trim();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Ollama is not running at ${this.baseUrl}. Start it with: ollama serve`);
        }
        if (error.code === 'ECONNABORTED') {
          throw new Error(`Ollama timed out after ${this.timeout}ms`);
        }
        throw new Error(`Ollama API error: ${error.response?.status} ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if Ollama is reachable.
   */
  async validateConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all available models from Ollama.
   */
  async listAvailableModels(): Promise<string[]> {
    const response = await axios.get<{ models: Array<{ name: string }> }>(
      `${this.baseUrl}/api/tags`,
      { timeout: 5000 }
    );
    return response.data.models.map((m) => m.name);
  }

  /**
   * Change the active model.
   */
  setModel(model: string): void {
    this.model = model;
  }

  getModel(): string {
    return this.model;
  }
}
