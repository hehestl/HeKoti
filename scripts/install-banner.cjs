"use strict";

/**
 * HeKoti install / startup banner. Suppressed in CI, GitHub Actions, and when SKIP_HEKOTI_BANNER=1,
 * unless argv contains --startup (Docker entrypoint).
 */
function main() {
  const force = process.argv.includes("--startup");
  if (
    !force &&
    (process.env.SKIP_HEKOTI_BANNER === "1" ||
      process.env.CI === "true" ||
      process.env.CONTINUOUS_INTEGRATION === "true" ||
      process.env.GITHUB_ACTIONS === "true")
  ) {
    return;
  }

  const banner = `
-------------------------------------
 _   _      _  __     _   _ 
| | | | ___| |/ /___ | |_(_)
| |_| |/ _ \\ ' // _ \\| __| |
|  _  |  __/ . \\ (_) | |_| |
|_| |_|\\___|_|\\_\\___/ \\__|_|
-------------------------------------
Project: HeKoti
Type: Light Wiki / Knowledge Archive
Version: Snibox 2.0
Status: Online
-------------------------------------
EN: A wiki reference, an archive of knowledge.
EN: "Ask HeKoti — and knowledge shall awaken from its sleep."

RU: Лайт-вики, архив знаний.
RU: "Спроси HeKoti — и знание пробудится ото сна."
-------------------------------------
GitHub:
https://github.com/hehestl/HeKoti
-------------------------------------
`.trimStart();

  console.log(banner);
}

main();
