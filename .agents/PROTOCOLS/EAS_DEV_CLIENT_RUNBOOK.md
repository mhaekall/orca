# Expo Dev Client & Metro Bundler Runbook (Termux Environment)

This document serves as a survival guide for running and debugging the Expo Development Client (Dev APK) locally using Metro Bundler inside a Termux Android environment. It encapsulates critical lessons learned from severe native crashes, layout engine failures, and dependency conflicts.

## 1. The "Catch-22" Dependency Conflict: Termux ENOSPC vs EAS Build
**The Problem:**
Running Metro Bundler via `pnpm` inside a Monorepo triggers a fatal `ENOSPC: System limit for number of file watchers reached` crash in Termux. This happens because `pnpm` creates a massive `.pnpm` virtual store with deep symlinks, and Metro attempts to watch all of them, exhausting Android's file watcher limits.

If you attempt to exclude the `.pnpm` folder from Metro's `watchFolders`, Metro becomes "blind" and throws an `UnableToResolveError` for all symlinked packages (like `expo-router`).

**The Solution:**
We intentionally break the monorepo rule for `apps/mobile/`.
Instead of `pnpm`, we use standard `npm` to install the mobile app dependencies locally. This creates a flat, predictable `node_modules` folder without any symlinks, allowing Metro to run effortlessly without hitting the ENOSPC limit.
```bash
cd apps/mobile
rm -rf node_modules
npm install --legacy-peer-deps
```

*Note on EAS Build:* Ensure that `apps/mobile/package-lock.json` is **DELETED** before triggering `eas build`. If both `pnpm-lock.yaml` (root) and `package-lock.json` exist, the EAS cloud Linux server will crash with an `ERESOLVE` or package manager conflict during the "Install dependencies" phase. 

## 2. React Native Text Rendering Strictness
**The Problem:**
`ERROR: Text strings must be rendered within a <Text> component.`
Unlike React Web (Next.js), React Native's Yoga layout engine will instantly crash the entire application if a loose string (e.g., `""`) or number (e.g., `0`) is rendered outside of a `<Text>` wrapper.

**The Solution:**
Never use loose logical AND (`&&`) for conditional rendering if the left side can evaluate to an empty string or zero. Always explicitly cast to a boolean (`!!`).
```tsx
// ❌ DANGEROUS: Crashes if d.nativeTitle is "" or rank is 0
{d.nativeTitle && <Text>{d.nativeTitle}</Text>}
{rank && <Text>{rank}</Text>}

// ✅ SAFE: Explicitly cast to boolean
{!!d.nativeTitle && <Text>{d.nativeTitle}</Text>}
{!!rank && <Text>{rank}</Text>}
```

## 3. The `jsEngine: hermes` Native Crash
**The Problem:**
`couldn't find DSO to load: libhermes.so`
If `jsEngine` is set to `"jsc"` (JavaScriptCore) in `app.json`, EAS will compile the APK without the Hermes engine binaries. However, modern React Native (0.73+) and ExoPlayer attempt to initialize Hermes by default during native Android boot. This results in a fatal OS-level Force Close.

**The Solution:**
Always enforce `"jsEngine": "hermes"` in `app.json`. If you change this, you **MUST** run a full `eas build` to generate a new APK. Hot-reloading via Metro cannot inject missing C++/Java native binaries.

## 4. Native Slider Visibility & Layout Quirks on Android
The `@react-native-community/slider` has highly specific quirks on Android that cause it to become completely invisible or untouchable.

**A. The `100%` Width String Bug:**
If you set the Slider's style to `width: '100%'`, the underlying Android native widget fails to parse the string, collapsing its width to `0px`.
*Solution:* Use a Responsive Number Bridge. Get the container's width via `onLayout` and pass the raw number to the Slider's style.
```tsx
const [sliderWidth, setSliderWidth] = useState(Dimensions.get('window').width);
<View onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}>
  <Slider style={{ width: sliderWidth }} />
</View>
```

**B. The Touch-Swallowing Gradient Bug:**
Expo's `LinearGradient` component on Android ignores `pointerEvents="box-none"`. If you wrap interactive elements (like a Slider or Play button) inside a LinearGradient, the gradient will act as a bulletproof glass and swallow all touches.
*Solution:* Decouple them. Place the LinearGradient as an absolute background layer with `pointerEvents="none"`, and place your interactive controls in a sibling `View` with `pointerEvents="box-none"`.

**C. The ScrollView Overlap Bug:**
If a `ScrollView` below your video player has a negative margin (e.g., `marginTop: -20`) to create a seamless visual overlap, it will render *over* the video player in the Z-axis, stealing touches intended for the bottom controls.
*Solution:* Explicitly apply `zIndex: 100` and `elevation: 100` to the Video Player's container.