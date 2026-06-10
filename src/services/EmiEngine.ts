import EmiLitertModule, { TokenEventPayload, InferenceCompletePayload } from '../../modules/emi-litert/src/EmiLitertModule';

type OnTokenCallback = (token: string) => void;
type OnCompleteCallback = () => void;
type OnErrorCallback = (error: string) => void;

class EmiEngine {
  private activeSubscriptions: Map<string, {
    tokenListener: ReturnType<typeof EmiLitertModule.addListener>;
    completeListener: ReturnType<typeof EmiLitertModule.addListener>;
  }> = new Map();

  public async initModel(modelPath: string): Promise<void> {
    await EmiLitertModule.initModel(modelPath);
  }

  public async stopInference(): Promise<void> {
    await EmiLitertModule.stopInference();
  }

  public async cleanup(): Promise<void> {
    await EmiLitertModule.cleanup();
  }

  public async clearChatSessionMemory(): Promise<void> {
    try {
      await EmiLitertModule.resetSessionMemory();
      console.log("KV Cache memory cleared natively.");
    } catch (error) {
      console.error("Failed to reset session:", error);
    }
  }

  public async saveSessionMemory(cacheFileName: string): Promise<void> {
    try {
      await EmiLitertModule.saveSessionMemory(cacheFileName);
      console.log(`Saved session memory: ${cacheFileName}`);
    } catch (error) {
      console.error(`Failed to save session memory ${cacheFileName}:`, error);
    }
  }

  public async restoreSessionMemory(cacheFileName: string): Promise<void> {
    try {
      await EmiLitertModule.restoreSessionMemory(cacheFileName);
      console.log(`Restored session memory: ${cacheFileName}`);
    } catch (error) {
      console.error(`Failed to restore session memory ${cacheFileName}:`, error);
    }
  }

  public async switchActiveChatContext(
    nextChatId: string, 
    recentHistoryMessages: { role: 'user' | 'model'; text: string }[]
  ): Promise<void> {
    try {
      // 1. Wipe out Chat A's context map cleanly from phone RAM
      await EmiLitertModule.clearActiveSessionMemory();
      
      // 2. Allocate an isolated empty map for Chat B
      await EmiLitertModule.initializeNewSessionMemory();
      
      // 3. Fast Prefill: Feed the last 2-3 historical exchanges quietly into the background 
      // to give the model immediate context memory before the user types a new prompt.
      for (const msg of recentHistoryMessages) {
         // Pass the background context frames sequentially 
         // without triggering token event UI flows
         await EmiLitertModule.triggerInference(msg.text, `prefill_${Date.now()}`);
      }
      
      console.log(`Context cleanly shifted and re-hydrated for chat: ${nextChatId}`);
    } catch (error) {
      console.error("Failed handling native sidebar transition context switch:", error);
    }
  }

  public async inference(
    prompt: string,
    messageId: string,
    onToken: OnTokenCallback,
    onComplete: OnCompleteCallback,
    onError?: OnErrorCallback
  ) {
    this.cleanupSubscription(messageId);

    const tokenListener = EmiLitertModule.addListener('onToken', (payload: TokenEventPayload) => {
      if (payload.messageId === messageId) {
        onToken(payload.token);
      }
    });

    const completeListener = EmiLitertModule.addListener('onInferenceComplete', (payload: InferenceCompletePayload) => {
      if (payload.messageId === messageId) {
        onComplete();
        this.cleanupSubscription(messageId);
      }
    });

    this.activeSubscriptions.set(messageId, {
      tokenListener,
      completeListener
    });

    try {
      onToken('\n[JS SYSTEM]: Requesting Native Inference...');
      await EmiLitertModule.triggerInference(prompt, messageId);
      onToken('\n[JS SYSTEM]: Native module accepted the request...');
    } catch (e: any) {
      console.error('Inference failed:', e);
      const errorMsg = e?.message || String(e);
      onToken('\n[JS CATCH ERROR]: ' + errorMsg);
      this.cleanupSubscription(messageId);
      onComplete();
      onError?.(errorMsg);
    }
  }

  private cleanupSubscription(messageId: string) {
    const subs = this.activeSubscriptions.get(messageId);
    if (subs) {
      subs.tokenListener.remove();
      subs.completeListener.remove();
      this.activeSubscriptions.delete(messageId);
    }
  }
}

export const emiEngine = new EmiEngine();