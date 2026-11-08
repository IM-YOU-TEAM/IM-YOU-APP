// Copies the MediaPipe WASM runtime out of node_modules so the web app can load it
// from /mediapipe/wasm. The files stay out of git; npm install runs this.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const visionInstaller = join(
  root,
  'node_modules/react-native-vision-camera/ios/FrameProcessors/VisionCameraInstaller.mm',
);
const visionCompatMarker = 'VisionCameraBridgeRuntime';
const legacyVisionInstaller = `@implementation VisionCameraInstaller

+ (BOOL)installWithDelegate:(id<VisionCameraProxyDelegate>)delegate {
  // TODO: Migrate away from RCTBridge to support new arch.
  RCTBridge* bridge = delegate.getBridge;
  RCTCxxBridge* cxxBridge = (RCTCxxBridge*)bridge;
  if (!cxxBridge.runtime) {
    return NO;
  }

  jsi::Runtime& runtime = *(jsi::Runtime*)cxxBridge.runtime;

  // global.VisionCameraProxy
  auto visionCameraProxy = std::make_shared<VisionCameraProxy>(runtime, bridge.jsCallInvoker, delegate);`;
const compatibleVisionInstaller = `@protocol VisionCameraBridgeRuntime <NSObject>
@property(nonatomic, readonly) void* runtime;
@property(nonatomic, readonly) std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker;
@end

@implementation VisionCameraInstaller

+ (BOOL)installWithDelegate:(id<VisionCameraProxyDelegate>)delegate {
  // RN 0.88 keeps these selectors on both RCTCxxBridge and RCTBridgeProxy,
  // but no longer exports the legacy RCTCxxBridge type to native libraries.
  id<VisionCameraBridgeRuntime> bridge = (id<VisionCameraBridgeRuntime>)delegate.getBridge;
  void* runtimePointer = bridge.runtime;
  if (runtimePointer == nullptr) {
    return NO;
  }

  jsi::Runtime& runtime = *(jsi::Runtime*)runtimePointer;

  // global.VisionCameraProxy
  auto visionCameraProxy = std::make_shared<VisionCameraProxy>(runtime, bridge.jsCallInvoker, delegate);`;
const pkg = join(root, 'node_modules/@mediapipe/tasks-vision');
const wasmFrom = join(pkg, 'wasm');
const wasmTo = join(root, 'public/mediapipe/wasm');
const bundleFrom = join(pkg, 'vision_bundle.mjs');
const bundleTo = join(root, 'public/mediapipe/vision_bundle.mjs');

if (existsSync(visionInstaller)) {
  const installer = readFileSync(visionInstaller, 'utf8');
  if (!installer.includes(visionCompatMarker)) {
    if (!installer.includes(legacyVisionInstaller)) {
      throw new Error(`VisionCamera installer changed; compatibility patch was not applied: ${visionInstaller}`);
    }
    writeFileSync(visionInstaller, installer.replace(legacyVisionInstaller, compatibleVisionInstaller));
    console.log('Patched VisionCamera 4 for React Native 0.88.');
  }
}

if (!existsSync(wasmFrom) || !existsSync(bundleFrom)) {
  console.warn('MediaPipe is not installed yet; skipping the pose runtime copy.');
  process.exit(0);
}

mkdirSync(wasmTo, { recursive: true });
cpSync(wasmFrom, wasmTo, { recursive: true });
cpSync(bundleFrom, bundleTo);
