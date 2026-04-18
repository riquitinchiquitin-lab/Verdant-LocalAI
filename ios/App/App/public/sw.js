/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-5a5d9309'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-512x512.png",
    "revision": "d41d8cd98f00b204e9800998ecf8427e"
  }, {
    "url": "pwa-192x192.png",
    "revision": "d41d8cd98f00b204e9800998ecf8427e"
  }, {
    "url": "masked-icon.svg",
    "revision": "d41d8cd98f00b204e9800998ecf8427e"
  }, {
    "url": "manifest.webmanifest",
    "revision": "07b665538e4b39709ed32bf831983c30"
  }, {
    "url": "logo.svg",
    "revision": "fc111a078ff815319b4751339dc9c4e2"
  }, {
    "url": "index.html",
    "revision": "2fca687551bcfa466f4dce0e5f60a21f"
  }, {
    "url": "env-config.js",
    "revision": "47f1059a08afd2dc523d11d51ce07326"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d41d8cd98f00b204e9800998ecf8427e"
  }, {
    "url": "assets/web-BMRZx3fM.js",
    "revision": null
  }, {
    "url": "assets/main-goucSYMJ.css",
    "revision": null
  }, {
    "url": "assets/main-CJvZN07J.js",
    "revision": null
  }, {
    "url": "assets/lib-CVq0SE3y.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d41d8cd98f00b204e9800998ecf8427e"
  }, {
    "url": "logo.svg",
    "revision": "fc111a078ff815319b4751339dc9c4e2"
  }, {
    "url": "masked-icon.svg",
    "revision": "d41d8cd98f00b204e9800998ecf8427e"
  }, {
    "url": "pwa-192x192.png",
    "revision": "d41d8cd98f00b204e9800998ecf8427e"
  }, {
    "url": "pwa-512x512.png",
    "revision": "d41d8cd98f00b204e9800998ecf8427e"
  }, {
    "url": "manifest.webmanifest",
    "revision": "07b665538e4b39709ed32bf831983c30"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
