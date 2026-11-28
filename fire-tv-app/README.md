# Jambaloop for Fire TV

A small Android TV app: it opens the Jambaloop website full screen, set up as the TV (`?tv`), so the page is
laid out at 1280 wide and scaled to the television. The games all run on the website, so the app does not need
updating when the games change.

- **Remote:** up, down, left and right move between buttons; OK presses; the menu button returns to the Jambaloop
  home screen; Back goes back (and leaves the app from the home screen).
- **Sound** plays without having to press anything first.
- **Built by GitHub:** `.github/workflows/fire-tv-app.yml` builds `app-debug.apk` on every change to this folder.
- **Download:** the current build is served by the site itself at `/tv.apk` (`public/tv.apk`, copied from the
  build artifact of the commit that added it; replace it when the app changes).

## Installing on a Fire TV Stick

Works on Fire TV devices that run Fire OS (Android based). The newest sticks that run Vega OS cannot install
Android apps; use the Silk browser and `/?tv` there instead.

1. On the Fire TV: Settings, My Fire TV, About, and press OK on the device name seven times to turn on Developer
   Options. Then Settings, My Fire TV, Developer Options, Install unknown apps, and allow **Downloader**.
2. Install the free **Downloader** app from the Amazon Appstore.
3. In Downloader, type **jambaloop-family-test.onrender.com/tv.apk** and press Go, then Install.
4. Jambaloop appears with your apps. Hold the home button and choose Apps to move it to the front.

The app is signed with a development key, so installing a newer build may ask you to remove the old one first.
