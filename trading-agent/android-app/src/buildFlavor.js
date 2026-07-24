/**
 * Flipped to `true` by the CI demo-build step before running the Gradle
 * assemble task for the demo APK variant (source swap, since Metro bundles
 * this value into the JS at build time — there's no runtime toggle). Default
 * `false` here is what every normal build and local dev run gets.
 */
export const IS_DEMO = false;
