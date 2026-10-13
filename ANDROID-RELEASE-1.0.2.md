# DealzyAI Android 1.0.2

Package `com.dealzy.ai`, version code 3. Update of the existing production WebView app. It continues to load `https://dealzy-v1.vercel.app` to retain the same origin for accounts, saved favorites and local preferences. The web release includes the approved Évasion interface, animated day/night modes, restored Booking/Expedia cards, compact secondary partners and small SIM CORP © signature.

Native changes: matching ivory/gold departure mark on forest green, adaptive launcher artwork, visible DealzyAI label and matching system bars. Runtime permission behavior, navigation and partner URL routing remain unchanged.

Build: Android 35, AGP 8.7.3, Gradle 8.9, Java 17. The CI workflow produces unsigned APK/AAB plus lint report and the Android signing tool; signing is performed separately with the existing private key. No signing credentials belong in this repository or its workflow artifacts.
