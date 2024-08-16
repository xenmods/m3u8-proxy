# m3u8-proxy

`m3u8-proxy` is a TypeScript-based proxy server that serves M3U8 playlist files. It is designed to be lightweight, easy to deploy, and efficient for streaming purposes.

## Note

This proxy is only for m3u8 files, i might add support for other file types in the future.

## Features

- **Serve M3U8 files**: Acts as a proxy server to handle and serve M3U8 files, ensuring smooth streaming experiences.
- **Easy Deployment**: Quickly deployable to cloud platforms such as Koyeb.
- **TypeScript**: Written in TypeScript for robust type safety and maintainability.
- **Lightweight**: Minimal dependencies to keep the project fast and responsive.
- **Efficient**: Designed to be efficient for streaming purposes.

## Try it out

You can try out the proxy by making a request to the following URL:

```
https://renewed-georgeanne-nekonode-1aa70c0c.koyeb.app/fetch/m3u8?url=https://example.com/playlist.m3u8
```

Using this for Images:

```
https://renewed-georgeanne-nekonode-1aa70c0c.koyeb.app/fetch/image?url=https://gogocdn.net/cover/dead-dead-demons-dededede-destruction.png
```

## Deployment 

[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?name=simple-proxy&type=git&repository=DeveloperJosh/m3u8-proxy&branch=main&env[PORT]=3000&ports=3000;http;/&builder=dockerfile)