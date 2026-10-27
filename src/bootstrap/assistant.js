import { createAssistant } from '../application/assistant/ask-assistant.js';
import { createOllamaClient } from '../infrastructure/assistant/ollama-client.js';
import { createDesktopModel } from '../infrastructure/assistant/desktop-model.js';
import { workspace } from './workspace.js';

const media = Object.fromEntries(['prepare','compare','manual'].map(method => [method, async (...args) => (await import('../infrastructure/assistant/media.js')).assistantMedia[method](...args)]));

export const assistant = createAssistant({ languageModel: window.creativaAssistant
  ? createDesktopModel(window.creativaAssistant) : createOllamaClient(), media,
  designs: { get: (session, orderId, designId) => workspace.getDesign(session, orderId, designId) } });
