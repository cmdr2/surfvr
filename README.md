Surf 1 'Howling Wolf' release
(by cmdr2)

Surf is a Firefox extension for viewing Virtual Reality worlds. These worlds are written using standard HTML5, CSS3 and Javascript.

The 'Howling Wolf' release is the first preview build.

Current supports Oculus Rift, and a yet-to-be-checked-in experimental support for Android devices.

Installing
----------
1. Download build/surfvr-1-howlingwolf.xpi to your Windows or Mac system.
2. Install Firefox Nightly (33.0a1), or use stable Firefox 33.0 (if released by the time you read this).
3. Open surfvr-1-howlingwolf.xpi in Firefox to install the plugin.
4. Install Oculus Bridge for your Windows or Mac system from: https://github.com/Instrument/oculus-bridge/tree/master/app/build

Usage
-----
1. Connect your Oculus Rift.
2. Open Oculus Bridge.
3. Open Firefox.
4. Open chrome://surf/content/main.xul.
5. Enjoy the VR website that is loaded.

Changing the VR website
-----------------------
An address bar for use from within the VR view is planned. Until that's done, you can edit content/main.xul and change the 'src' attribute of the 'backpage' iframe, and rebuild the Firefox extension by executing 'make' in the project directory.

Building
--------
Make your changes, and execute 'make' in the project directory.

Contributing
------------
This is a community project, if you want a feature bad enough, submit a pull request on github. If you want to improve the project, submit a pull request on github. If you want to add a jokes file, submit a pull request on github.
