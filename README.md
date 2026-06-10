# React Native LiteRT LM 🤖📱

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Expo](https://img.shields.io/badge/Expo-56-blue.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.85-61dafb.svg)](https://reactnative.dev/)
[![LiteRT](https://img.shields.io/badge/LiteRT--LM-Google-green.svg)](https://ai.google.dev/edge/litert)

A premium, local-first, air-gapped boilerplate template for running on-device Large Language Models (LLMs) inside **React Native (Expo)** applications using **Google LiteRT-LM** (formerly TensorFlow Lite). 

This repository includes a native local Expo Module wrapper for the LiteRT C++/Kotlin hardware engine, paired with a modern, fluid Gemini-style chat UI.

---

## ✨ Key Features

- **🔒 100% Air-Gapped & Private**: Runs completely offline. Zero cloud API calls, zero telemetry, and zero network traffic. 
- **⚡ Local Native Inference**: Integrates directly with hardware threads via custom Expo native module wrappers (`modules/emi-litert`) for Android (Kotlin) and iOS (Swift).
- **🌊 Async Token Streaming**: Supports fluid, asynchronous token-by-token text streaming into a lightweight UI buffer.
- **⏹️ Stop/Cancel Generation**: Allows the user to interrupt and stop inference at any time, saving the partially generated "half-response" to the database.
- **💾 SQLite Persistence**: Automatically saves chat sessions, message histories, and partial responses using Expo SQLite.
- **🎨 Modern Gemini-Style UI**: Responsive black-and-white theme built with NativeWind 4, adapting dynamically to the device's light and dark modes.

---

## 🛠️ Tech Stack & Requirements

- **Framework**: React Native (Expo SDK 56 workflow)
- **Styling**: NativeWind 4 (Tailwind CSS)
- **Persistence**: Expo SQLite
- **Local AI Engine**: Google LiteRT-LM SDK
- **Target Model**: Quantized Gemma 2B or similar edge models (`.litertlm` / `.tflite` format)
- **Hardware Requirement**: Physical mobile device with a baseline of 8GB RAM for smooth execution.

---

## 📦 Directory Overview

```bash
├── modules/
│   └── emi-litert/          # The custom local native Expo Module wrapper
│       ├── android/         # Native Android LiteRT setup (Kotlin)
│       ├── ios/             # Native iOS LiteRT setup (Swift)
│       └── src/             # Typescript interfaces for the native module
├── src/
│   ├── app/                 # Expo Router screens (index, setup, layout)
│   ├── components/          # Reusable UI components (modals, drawer, composer)
│   ├── services/
│   │   ├── EmiEngine.ts     # The JS/TS interface to the native module
│   │   └── Database.ts      # SQLite Database Service
│   └── constants/           # Theming constants
├── .github/
│   └── workflows/           # CI/CD pipelines (Auto-builds Android release APK)
└── app.json                 # Expo project configuration
```

---

## 🚀 Getting Started

Running local LLMs requires downloading the weights separately since model files are too large to package directly inside a Git repository.

### 1. Download the Model File
1. Go to the Hugging Face LiteRT Community: [litert-community/gemma-4-E2B-it-litert-lm](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm) (or download another LiteRT-supported Edge model).
2. Download the **`gemma-4-E2B-it.litertlm`** file (approx 2.59 GB).
3. Connect your physical device to your computer and transfer the model file to the `Downloads` directory.

### 2. Install Dependencies
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/react-native-litert-lm.git
cd react-native-litert-lm

# Install dependencies
pnpm install
```

### 3. Generate Native Folders (Prebuild)
Since this project uses native C++ and Kotlin/Swift libraries for hardware inference, you must run the prebuild step to generate the native `/android` and `/ios` configurations:
```bash
pnpm expo prebuild --platform android
```

### 4. Run the Project
Connect your physical device via USB or ensure the Emulator is running, then run:
```bash
# Start Android version
pnpm run android

# Start iOS version
pnpm run ios
```

### 5. Initialize the AI Engine
1. Open the app on your physical device.
2. Tap **[ Select Model File ]** on the setup screen.
3. Select the `.litertlm` model file you downloaded to your device in Step 1.
4. The app will securely copy the model into its local application document sandbox (`FileSystem.documentDirectory`) and boot the native engine.

---

## ⚙️ How Native Inference Works

JavaScript is single-threaded and would freeze if it attempted to load or run a 2.5GB model file. To protect the main JS thread, the application delegates all model lifecycle events to background native threads:

1. **Instantiation**: JavaScript requests model initialization with the model file URI.
2. **Execution**: When a prompt is submitted, JavaScript calls `triggerInference(...)`.
3. **Streaming**: The native module spawns a thread to process the model output, emitting `onToken` events via the Expo Event Emitter directly into a React state buffer.
4. **Completion**: Once the model finishes or is stopped, the native module triggers `onInferenceComplete`, and the JavaScript thread writes the accumulated text to the SQLite database.

---

## 🔒 Privacy & Air-Gap Compliance

This template is designed with strict privacy boundaries:
- **No Cloud Networking**: It does not make any external API calls to OpenAI, Anthropic, Gemini Cloud, or Google Cloud.
- **Zero Logging**: There are no telemetry scripts, analytic hooks, or external tracing configurations in the codebase.
- **Local SQLite Storage**: All chat messages and titles are written strictly to the local SQLite database sandbox.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
