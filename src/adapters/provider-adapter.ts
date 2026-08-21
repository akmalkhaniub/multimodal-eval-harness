import { ModelProvider, MultimodalInput, ProviderResponse } from '../types/index.js';

export interface IMultimodalAdapter {
  provider: ModelProvider;
  process(input: MultimodalInput): Promise<ProviderResponse>;
}
