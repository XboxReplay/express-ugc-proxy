# Express UGC Proxy

Express middleware to proxy user-generated content as screenshot and gameclip to your own host and embed them on social media platforms such as Facebook, Twitter, Discord, etc.

<img src="twitter-preview.png" width="520" />

# But, why?

Each user-generated content has an unique URI which is only valid for a few hours. If this URI is used and shared on an external platform (via direct link or fetched by the platform itself thanks to the meta tags) it may be cached and will become unreachable once expired; Or worse, blocked by default for security reason (CORS policies).

The idea behind this proxy is to create an unique URI for each content and handle all the fetch / reload logic inside it.

### Examples

**Important notice:** This proxy is inspired by what is already done on XboxReplay.net but not used by it for legacy reasons so the links below do not reflect the real behavior of it. As said, the `Express UGC Proxy` performs better for [a lot of reasons](https://i.redd.it/mgjvqsd2j8e31.jpg).

* **Gameclip:** https://www.xboxreplay.net/ugc-files/clips/2535465515082324/d1adc8aa-0a31-4407-90f2-7e9b54b0347c/388f97c0-17bc-4939-a592-d43c365acc48/gameclip.mp4
* **Gameclip thumbnail (Small):** https://www.xboxreplay.net/ugc-files/clips/2535465515082324/d1adc8aa-0a31-4407-90f2-7e9b54b0347c/388f97c0-17bc-4939-a592-d43c365acc48/thumbnail-small.png
* **Screenshot (Large):** https://www.xboxreplay.net/ugc-files/screenshots/2535465515082324/d1adc8aa-0a31-4407-90f2-7e9b54b0347c/1f002a0d-6100-4976-b5c6-e3580b6bc061/screenshot.png

# WORK IN PROGRESS
