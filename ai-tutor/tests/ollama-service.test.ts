import { OllamaService } from '../src/services/ollama-service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaService', () => {
  let service: OllamaService;

  beforeEach(() => {
    service = new OllamaService('http://localhost:11434', 'mistral');
    jest.clearAllMocks();
  });

  describe('generateResponse', () => {
    it('should return the response text from Ollama', async () => {
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: { response: '¡Buena pregunta! ¿Qué crees que deberías hacer primero?', done: true }
      });

      const result = await service.generateResponse('Test prompt');
      expect(result).toContain('¡Buena pregunta!');
    });

    it('should throw when Ollama is not running', async () => {
      const err: any = new Error('Connection refused');
      err.code = 'ECONNREFUSED';
      mockedAxios.post = jest.fn().mockRejectedValue(err);
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

      await expect(service.generateResponse('prompt')).rejects.toThrow('Ollama is not running');
    });

    it('should throw when response is empty', async () => {
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: { response: '', done: true }
      });

      await expect(service.generateResponse('prompt')).rejects.toThrow('Ollama returned empty response');
    });
  });

  describe('validateConnection', () => {
    it('should return true when Ollama responds', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({ data: { models: [] } });
      const result = await service.validateConnection();
      expect(result).toBe(true);
    });

    it('should return false when Ollama is unreachable', async () => {
      mockedAxios.get = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await service.validateConnection();
      expect(result).toBe(false);
    });
  });

  describe('model management', () => {
    it('should allow switching models', () => {
      service.setModel('llama3');
      expect(service.getModel()).toBe('llama3');
    });

    it('should list models from API', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: { models: [{ name: 'mistral' }, { name: 'llama3' }] }
      });
      const models = await service.listAvailableModels();
      expect(models).toEqual(['mistral', 'llama3']);
    });
  });
});
