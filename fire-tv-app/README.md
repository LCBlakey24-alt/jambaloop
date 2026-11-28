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

Checked against the owner's stick on 28 November 2026: a Fire TV Stick HD (1st generation) on Fire OS 7.7, which
is Android based, so the app installs (not yet tried on it).

1. Install the free **Downloader** app from the Amazon Appstore (search for "Downloader"). It has to be installed
   first, or it is missing from the list in step 3.
2. Settings, My Fire TV, About: press OK on the device name (for example "Fire TV Stick") seven times, until it
   says you are now a developer. This shows the hidden Developer Options menu.
3. Back to Settings, My Fire TV, Developer Options, Install unknown apps, and switch **Downloader** on.
4. Open Downloader, type **jambaloop-family-test.onrender.com/tv.apk** in the address box, press Go, then Install.
   Choose Done (not Open) if you want Downloader to offer to delete the download afterwards; it is tiny either way.
5. Jambaloop is now with your apps: press and hold the home button, choose Apps, and move it to the front.

The app is signed with a development key, so installing a newer build may ask you to remove the old one first.
