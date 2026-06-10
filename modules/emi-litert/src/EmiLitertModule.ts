import { NativeModule, requireNativeModule } from 'expo';

export type TokenEventPayload = {
  messageId: string;
  token: string;
};

export type InferenceCompletePayload = {
  messageId: string;
};

export type EmiLitertEvents = {
  onToken: (payload: TokenEventPayload) => void;
  onInferenceComplete: (payload: InferenceCompletePayload) => void;
};

declare class EmiLitertModule extends NativeModule<EmiLitertEvents> {
  initModel(modelPath: string): Promise<void>;
  triggerInference(prompt: string, messageId: string): Promise<void>;
  resetSessionMemory(): Promise<void>;
  saveSessionMemory(cacheFileName: string): Promise<void>;
  restoreSessionMemory(cacheFileName: string): Promise<void>;
  clearActiveSessionMemory(): Promise<void>;
  initializeNewSessionMemory(): Promise<void>;
  stopInference(): Promise<void>;
  cleanup(): Promise<void>;
}

let moduleInstance: any = null;

try {
  moduleInstance = requireNativeModule<EmiLitertModule>('EmiLitert');
} catch (e) {
  console.warn("EmiLitert native module not found. Using JS mock implementation for Expo Go / web development.");
  
  class MockEmiLitertModule {
    private listeners: Map<string, Array<(payload: any) => void>> = new Map();

    addListener(eventName: string, listener: (payload: any) => void) {
      if (!this.listeners.has(eventName)) {
        this.listeners.set(eventName, []);
      }
      this.listeners.get(eventName)!.push(listener);
      return {
        remove: () => {
          const arr = this.listeners.get(eventName) || [];
          const idx = arr.indexOf(listener);
          if (idx !== -1) arr.splice(idx, 1);
        }
      };
    }

    emit(eventName: string, payload: any) {
      const arr = this.listeners.get(eventName) || [];
      for (const cb of arr) {
        cb(payload);
      }
    }

    async initModel(modelPath: string): Promise<void> {
      console.log("[Mock EmiLitert] initModel:", modelPath);
    }

    async triggerInference(prompt: string, messageId: string): Promise<void> {
      console.log("[Mock EmiLitert] triggerInference:", prompt, messageId);
      
      const mockReply = `Hello! This is a simulated response from the Emi local AI engine. 

I see you are running the app inside **Expo Go**, which doesn't support our custom C++ native hardware acceleration modules. 

To test the actual C++ hardware inference engine on device, you can build the native client (e.g. run "pnpm android" or "pnpm ios").

For now, you can fully test the chat UI, markdown formatting, sidebar history, deletions, session switching, and scrolling right here in Expo Go! Let me know if you need help with anything else.`;
      
      const tokens = mockReply.split(' ');
      let currentTokenIndex = 0;
      
      const interval = setInterval(() => {
        if (currentTokenIndex < tokens.length) {
          const token = tokens[currentTokenIndex] + (currentTokenIndex < tokens.length - 1 ? ' ' : '');
          this.emit('onToken', { messageId, token });
          currentTokenIndex++;
        } else {
          clearInterval(interval);
          this.emit('onInferenceComplete', { messageId });
        }
      }, 50); // Faster streaming for responsive testing
    }

    async resetSessionMemory(): Promise<void> {
      console.log("[Mock EmiLitert] resetSessionMemory");
    }

    async saveSessionMemory(cacheFileName: string): Promise<void> {
      console.log("[Mock EmiLitert] saveSessionMemory:", cacheFileName);
    }

    async restoreSessionMemory(cacheFileName: string): Promise<void> {
      console.log("[Mock EmiLitert] restoreSessionMemory:", cacheFileName);
    }

    async clearActiveSessionMemory(): Promise<void> {
      console.log("[Mock EmiLitert] clearActiveSessionMemory");
    }

    async initializeNewSessionMemory(): Promise<void> {
      console.log("[Mock EmiLitert] initializeNewSessionMemory");
    }

    async stopInference(): Promise<void> {
      console.log("[Mock EmiLitert] stopInference");
    }

    async cleanup(): Promise<void> {
      console.log("[Mock EmiLitert] cleanup");
    }
  }

  moduleInstance = new MockEmiLitertModule();
}

export default moduleInstance;
