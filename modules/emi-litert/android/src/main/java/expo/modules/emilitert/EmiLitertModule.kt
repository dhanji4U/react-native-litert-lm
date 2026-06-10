package expo.modules.emilitert

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.Exceptions
import kotlinx.coroutines.*
import java.io.File
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.Conversation
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.SamplerConfig
import com.google.ai.edge.litertlm.MessageCallback
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Message
import com.google.ai.edge.litertlm.ExperimentalApi
import com.google.ai.edge.litertlm.ExperimentalFlags
import com.google.ai.edge.litertlm.Capabilities
import java.util.concurrent.CancellationException
import android.util.Log

class EmiLitertModule : Module() {
  private val moduleScope = CoroutineScope(Dispatchers.Default)
  private var engine: Engine? = null
  private var conversation: Conversation? = null
  private var isGenerating = false
  private var currentMessageId: String? = null
  private var currentBackend: Backend = Backend.CPU()
  private var supportsSpeculativeDecoding = false

  companion object {
    private const val TAG = "EmiLitert"
  }

  @OptIn(ExperimentalApi::class)
  override fun definition() = ModuleDefinition {
    Name("EmiLitert")

    Events("onToken", "onInferenceComplete")

    AsyncFunction("initModel") { modelPath: String ->
      try {
        if (engine != null) {
          Log.d(TAG, "Engine already initialized, skipping")
          return@AsyncFunction
        }

        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

        Log.d(TAG, "initModel: modelPath=$modelPath")

        // Check model capabilities first
        var capabilities: Capabilities? = null
        try {
          capabilities = Capabilities(modelPath)
          supportsSpeculativeDecoding = capabilities.hasSpeculativeDecodingSupport()
          Log.d(TAG, "Capabilities: speculativeDecoding=$supportsSpeculativeDecoding")
        } catch (e: Exception) {
          Log.w(TAG, "Failed to read model capabilities: ${e.message}")
          supportsSpeculativeDecoding = false
        }

        // Force CPU Backend to fix iSWA / layout crash on mobile GPUs
        val selectedBackend = Backend.CPU()
        Log.d(TAG, "Forced CPU backend for inference stability")
        currentBackend = selectedBackend

        val cacheDir = context.cacheDir.absolutePath
        Log.d(TAG, "cacheDir=$cacheDir")

        val engineConfig = EngineConfig(
          modelPath = modelPath,
          backend = selectedBackend,
          maxNumTokens = 2048,
          cacheDir = cacheDir
        )

        Log.d(TAG, "EngineConfig: backend=${engineConfig.backend}, maxTokens=${engineConfig.maxNumTokens}, cacheDir=${engineConfig.cacheDir}")

        // Enable speculative decoding if supported
        if (supportsSpeculativeDecoding) {
          ExperimentalFlags.enableSpeculativeDecoding = true
          Log.d(TAG, "ExperimentalFlags.enableSpeculativeDecoding = true")
        }

        val newEngine = Engine(engineConfig)
        Log.d(TAG, "Engine created, initializing...")
        newEngine.initialize()
        Log.d(TAG, "Engine initialized successfully")

        // Disable speculative decoding flag after init (per Google pattern)
        ExperimentalFlags.enableSpeculativeDecoding = false

        // Create Conversation with constrained decoding enabled
        ExperimentalFlags.enableConversationConstrainedDecoding = true
        Log.d(TAG, "ExperimentalFlags.enableConversationConstrainedDecoding = true")

        val samplerConfig = if (selectedBackend is Backend.NPU) {
          Log.d(TAG, "NPU backend detected, using null SamplerConfig")
          null
        } else {
          SamplerConfig(
            topK = 40,
            topP = 1.0,
            temperature = 0.8
          )
        }

        val newConversation = newEngine.createConversation(
          ConversationConfig(
            samplerConfig = samplerConfig
          )
        )

        ExperimentalFlags.enableConversationConstrainedDecoding = false
        Log.d(TAG, "Conversation created successfully")

        engine = newEngine
        conversation = newConversation

        Log.d(TAG, "initModel: COMPLETE - Engine and Conversation ready")

      } catch (e: Exception) {
        Log.e(TAG, "initModel FAILED: ${e.message}", e)
        throw Exception("Failed to initialize LiteRT-LM Engine: ${e.message}")
      }
    }

    AsyncFunction("triggerInference") { prompt: String, messageId: String ->
      Log.d(TAG, "triggerInference: messageId=$messageId, prompt.length=${prompt.length}")

      this@EmiLitertModule.sendEvent("onToken", mapOf(
        "messageId" to messageId,
        "token" to "\n[NATIVE INIT]: triggerInference called"
      ))

      val conv = conversation ?: throw Exception("Engine is not initialized. Call initModel first.")

      if (isGenerating) {
        Log.w(TAG, "Inference already running, rejecting new request")
        throw Exception("An inference session is already running.")
      }

      moduleScope.launch {
        try {
          this@EmiLitertModule.sendEvent("onToken", mapOf(
            "messageId" to messageId,
            "token" to "\n[NATIVE SCOPE]: Background coroutine launched"
          ))
          isGenerating = true
          currentMessageId = messageId

          val contentsList = mutableListOf<Content>()
          contentsList.add(Content.Text(prompt))

          Log.d(TAG, "Calling sendMessageAsync...")

          conv.sendMessageAsync(
            Contents.of(contentsList),
            object : MessageCallback {
              var tokenCount = 0

              override fun onMessage(message: Message) {
                tokenCount++
                val msgId = currentMessageId ?: return
                var tokenStr = message.toString()
                if (tokenStr.isEmpty()) {
                  tokenStr = "[EMPTY_TOKEN]"
                }
                Log.v(TAG, "onMessage: token #$tokenCount = '$tokenStr'")
                this@EmiLitertModule.sendEvent("onToken", mapOf(
                  "messageId" to msgId,
                  "token" to tokenStr
                ))
              }

              override fun onDone() {
                val msgId = currentMessageId
                Log.d(TAG, "onDone: tokenCount=$tokenCount, msgId=$msgId")
                if (tokenCount == 0 && msgId != null) {
                  Log.w(TAG, "onDone called but 0 tokens emitted")
                  this@EmiLitertModule.sendEvent("onToken", mapOf(
                    "messageId" to msgId,
                    "token" to "\n[NATIVE DEBUG]: onDone called, but 0 tokens were emitted."
                  ))
                }
                isGenerating = false
                currentMessageId = null
                if (msgId != null) {
                  this@EmiLitertModule.sendEvent("onInferenceComplete", mapOf(
                    "messageId" to msgId
                  ))
                  Log.d(TAG, "onInferenceComplete event sent for $msgId")
                }
              }

              override fun onError(throwable: Throwable) {
                Log.e(TAG, "onError: ${throwable.message}", throwable)
                val msgId = currentMessageId
                isGenerating = false
                currentMessageId = null
                if (msgId != null) {
                  val errorMsg = "\n[NATIVE ERROR]: ${throwable.message}"
                  this@EmiLitertModule.sendEvent("onToken", mapOf(
                    "messageId" to msgId,
                    "token" to errorMsg
                  ))
                  this@EmiLitertModule.sendEvent("onInferenceComplete", mapOf(
                    "messageId" to msgId
                  ))
                  Log.d(TAG, "Error events sent for $msgId")
                }
              }
            },
            emptyMap()
          )
          Log.d(TAG, "sendMessageAsync returned (async)")

        } catch (e: Exception) {
          Log.e(TAG, "Synchronous inference error: ${e.message}", e)
          isGenerating = false
          currentMessageId = null
          this@EmiLitertModule.sendEvent("onToken", mapOf(
            "messageId" to messageId,
            "token" to "\n[SYNC NATIVE ERROR]: ${e.message}"
          ))
          this@EmiLitertModule.sendEvent("onInferenceComplete", mapOf(
            "messageId" to messageId
          ))
        }
      }
      
      // Explicitly return nothing to React Native, otherwise Expo tries to 
      // serialize the Coroutine Job and crashes with "Unknown type"
      return@AsyncFunction
    }

    AsyncFunction("resetSessionMemory") {
      Log.d(TAG, "resetSessionMemory called")
      val activeEngine = engine ?: throw Exception("Engine not initialized.")
      conversation?.close()
      conversation = activeEngine.createConversation()
      Log.d(TAG, "Conversation memory reset")
    }

    AsyncFunction("saveSessionMemory") { cacheFileName: String ->
      Log.d(TAG, "saveSessionMemory: cacheFileName=$cacheFileName (placeholder)")
    }

    AsyncFunction("restoreSessionMemory") { cacheFileName: String ->
      Log.d(TAG, "restoreSessionMemory: cacheFileName=$cacheFileName (placeholder)")
    }

    // 1. Instantly drops the current chat's active memory allocation to prevent bleed-over
    AsyncFunction("clearActiveSessionMemory") {
      Log.d(TAG, "Explicitly freeing active KV Cache memory to switch contexts.")
      try {
        conversation?.close()
        conversation = null
        Log.d(TAG, "Native conversation session freed successfully.")
      } catch (e: Exception) {
        Log.e(TAG, "Error cleaning native session: ${e.message}")
      }
    }

    // 2. Prepares a completely fresh pipeline for the incoming target chat profile
    AsyncFunction("initializeNewSessionMemory") {
      Log.d(TAG, "Initializing a fresh native context graph for the targeted conversation.")
      val activeEngine = engine ?: throw Exception("LiteRT Engine is not initialized.")
      
      moduleScope.launch {
        try {
          // Drops existing pointer safely if it wasn't cleared yet
          conversation?.close()
          
          // Re-instantiate a clean slate
          conversation = activeEngine.createConversation()
          Log.d(TAG, "Fresh isolated context map ready for next conversation turn.")
        } catch (e: Exception) {
          Log.e(TAG, "Failed to instantiate fresh session map: ${e.message}")
          // Ensure we fall back cleanly to avoid application crashing
          conversation = null
        }
      }
    }

    AsyncFunction("stopInference") {
      Log.d(TAG, "stopInference called")
      if (isGenerating && conversation != null) {
        conversation?.cancelProcess()
        isGenerating = false
        currentMessageId = null
        Log.d(TAG, "Inference cancelled")
      }
    }

    AsyncFunction("cleanup") {
      Log.d(TAG, "cleanup called")
      try {
        conversation?.close()
        Log.d(TAG, "Conversation closed")
      } catch (e: Exception) {
        Log.e(TAG, "Failed to close conversation: ${e.message}")
      }
      try {
        engine?.close()
        Log.d(TAG, "Engine closed")
      } catch (e: Exception) {
        Log.e(TAG, "Failed to close engine: ${e.message}")
      }
      engine = null
      conversation = null
      isGenerating = false
      currentMessageId = null
      Log.d(TAG, "Cleanup complete")
    }
  }
}