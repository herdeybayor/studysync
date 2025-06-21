# Using Larger Whisper Models in React Native

The error `Cannot create a string longer than 0x1fffffe8 characters` occurs because the `ggml-medium.bin` model is too large for React Native's bundler when using `require()`. Here are your options for using larger Whisper models:

## Option 1: Store the Model in the File System (Recommended)

Instead of bundling the model with `require()`, you should:

1. Add the model file to an external storage location
2. Access it using a file path

### Implementation Steps:

1. **Create a directory for models in your app's file system**:

```javascript
import RNFS from 'react-native-fs';

// Create models directory if it doesn't exist
const modelsDir = RNFS.DocumentDirectoryPath + '/models';
await RNFS.mkdir(modelsDir);
```

2. **Copy or download the model to this location**:

```javascript
// If your model is in assets but too large to require()
const modelDestPath = `${modelsDir}/ggml-medium.bin`;

// Check if model already exists to avoid re-copying
const modelExists = await RNFS.exists(modelDestPath);
if (!modelExists) {
  // Option A: Copy from app bundle (if you included a smaller version)
  await RNFS.copyFileAssets('models/ggml-medium.bin', modelDestPath);

  // OR Option B: Download from remote source
  const modelUrl = 'https://your-model-hosting-url/ggml-medium.bin';
  await RNFS.downloadFile({
    fromUrl: modelUrl,
    toFile: modelDestPath,
    progress: (res) => {
      const progress = (res.bytesWritten / res.contentLength) * 100;
      console.log(`Downloaded: ${progress.toFixed(2)}%`);
    },
  }).promise;
}
```

3. **Initialize Whisper with the file path**:

```javascript
import { initWhisper } from 'whisper.rn';

// Initialize with file path instead of require()
const whisperContext = await initWhisper({
  filePath: `file://${modelsDir}/ggml-medium.bin`,
});
```

## Option 2: Use Quantized Models

Quantized models offer a good trade-off between size and accuracy:

```javascript
// Use a quantized model that's small enough to be bundled
const whisperContext = await initWhisper({
  // q8 models are smaller than the full versions with minimal accuracy loss
  filePath: require('../assets/ggml-medium.q8_0.bin'),
});
```

## Option 3: First-Time Download During App Initialization

For a better user experience, implement a first-time download flow:

1. When the user first opens the app, show a download screen
2. Download the model to the app's storage
3. Show progress to the user
4. Once downloaded, initialize Whisper with the file path

## Implementation Notes:

1. **File Path Format**:

   - For iOS: `file://${RNFS.DocumentDirectoryPath}/models/ggml-medium.bin`
   - For Android: Same format, but ensure you have proper permissions set

2. **Network Considerations**:

   - Larger models should be downloaded on Wi-Fi only
   - Implement resumable downloads for large files

3. **Platform-Specific Code**:

   - Include platform checks to ensure proper file path handling
   - Use `.exists()` checks before initializing to avoid errors

4. **User Experience**:
   - Show download progress clearly
   - Allow users to choose which model size they want to download
   - Provide options to manage downloaded models

This approach solves the bundling size limitation while allowing you to use larger, more accurate models like `medium` or even `large` in your app.

## Additional Resources

- [Whisper.rn GitHub Repository](https://github.com/mybigday/whisper.rn)
- [React Native FS Documentation](https://github.com/itinance/react-native-fs)
- [Whisper Models on Hugging Face](https://huggingface.co/ggerganov/whisper.cpp)
