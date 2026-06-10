# Project Core Profile: EMI (Extension of Mind Interface)

## Objective

Build a local-first, high-density, privacy-centric personal AI mobile workspace engineered specifically for elite, data-restricted professionals (Doctors, Attorneys, and CEOs).

---

## 🛠️ Tech Stack & Integration Target

- **Frontend / Core UI:** React Native (Expo Workflow)
- **Styling Paradigm:** NativeWind 4
- **On-Device Storage:** Expo SQLite (SQLCipher compliance)
- **Local AI Inference Engine:** Google LiteRT-LM SDK (Native Android/iOS C++ & Kotlin hardware wrappers)
- **Primary Target Model:** Gemma 4 E2B (Edge 2 Billion Parameter, quantized .litertlm format)
- **Testing Hardware Target:** Physical Mobile Device with 8GB RAM Baseline + 2GB Virtual RAM optimization

---

## 🚀 Orchestrator Guidance: What We ARE Building Now

1. **Air-Gapped Foundation:** Build a 100% self-contained application architecture where the `.litertlm` model file is stored and initialized strictly inside the local application document sandbox (`FileSystem.documentDirectory`).
2. **Asynchronous Text Stream UI:** A fluid terminal/chat interface where tokens are received asynchronously from native hardware threads via an event emitter directly into a lightweight text state buffer.
3. **Professional Mode Matrix:** A prominent dashboard component allowing instantaneous toggling between three target prompt profiles: [ Clinical / SOAP Notes ] [ Legal Counsel ] [ Corporate Strategy ].

---

## 🚫 CRITICAL RESTRICTIONS: Strict Guards for Subagents

Antigravity agents and subagents must strictly adhere to these architectural boundaries to prevent broken builds:

1. **NO CLOUD NETWORKING STACKS:** Do not author any code blocks utilizing cloud-based LLM API adapters (such as OpenAI SDK, Anthropic API, or external Google Cloud AI wrappers). If a task tries to introduce an external API network call, discard it immediately.
2. **PROTECT THE JAVASCRIPT UI THREAD:** Never run model resource loading or heavy string parsing algorithms directly on the primary React Native JS execution loop. Push all file parsing and binary loads to background threads or native runtime module wrappers.
3. **STYLING CONSTRAINT (NATIVEWIND 4):** Do not use inline React Native StyleSheets or classic styled-components. All styling must be written declaratively using modern **NativeWind 4 utility class names**.
4. **GEMINI-STYLE CONSUMER UI:** The UI must resemble the official Gemini app layout. Implement a full black-and-white theme that responds dynamically to the device's light/dark mode settings. Use modern, slightly rounded chat bubbles and clear typographic hierarchy, avoiding the harsh "executive terminal" aesthetic.
5. **NO LOGGING OR TELEMETRY:** Never inject tracking, analytic scripts, Firebase telemetry, or external logging hooks. This app handles confidential information; all operations must leave zero network foot-traffic footprints.

---

## 📄 Expected Project Deliverables (Artifacts)

When generating code, the agents should output structured code modifications in clean blocks targeting:

- `/src/services/EmiEngine.ts` (The LiteRT native interface)
- `/App.tsx` (The executive dark-mode UI entry point)
- `/android/` & `/ios/` native plumbing setups where hardware allocations are handled

---

## 📊 Current State Analysis

- **Foundation Built**: The project is initialized as an Expo Router app (`src/app/index.tsx` serves as the entry point rather than a root `App.tsx`). 
- **Styling Configured**: NativeWind 4 and Tailwind CSS are successfully configured with the custom executive dark mode color palette (`terminal-dark`, `terminal-accent`).
- **Pending Native & LiteRT Integration**: The `/src/services/EmiEngine.ts` service and the `/android/` / `/ios/` native plumbing directories do not exist yet (requires running `npx expo prebuild`).
- **Pending Features**: The Asynchronous Text Stream UI and the Professional Mode Matrix dashboard are not yet implemented.