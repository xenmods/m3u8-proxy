# m3u8-proxy

`m3u8-proxy` is a TypeScript-based proxy server that serves M3U8 playlist files. It is designed to be lightweight, easy to deploy, and efficient for streaming purposes.

## Note

This proxy is only for m3u8 files, i might add support for other file types in the future.

## Features

- **Serve M3U8 files**: Acts as a proxy server to handle and serve M3U8 files, ensuring smooth streaming experiences.
- **Easy Deployment**: Quickly deployable to cloud platforms such as Vercel.
- **TypeScript**: Written in TypeScript for robust type safety and maintainability.
- **Lightweight**: Minimal dependencies to keep the project fast and responsive.
- **Efficient**: Designed to be efficient for streaming purposes.

## Usage

Here is how you can use `m3u8-proxy`:

```
your-server.com/fetch/m3u8?url=https://example.com/playlist.m3u8
```

## Deployment 

It seems bun is not working with Render.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/DeveloperJosh/m3u8-proxy.git)