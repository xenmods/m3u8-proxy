import { response, Router, type Request, type Response } from "express";
import axios from "axios";
import https from "https";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const { url, ref } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "No URL provided" });
  }

  // if vtt file, return it directly
  if (url.endsWith(".vtt")) {
    try {
      const response = await axios({
        method: "get",
        url,
        responseType: "arraybuffer",
        headers: ref ? { Referer: ref as string } : {},
      });

      res.setHeader("Content-Type", "text/vtt");
      res.setHeader("Content-Disposition", "inline");
      res.send(response.data);
    } catch (error) {
      console.clear();
      console.log(`[ERROR] ${error}`);
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          message: error.message,
          response: error.response?.data,
          headers: error.config?.headers ?? {},
        });
      }
      res.status(500).json({ error: "Failed to proxy content" });
    }
    return;
  }

  // if .key file return it directly
  if (url.endsWith(".key")) {
    try {
      const response = await axios({
        method: "get",
        url,
        responseType: "arraybuffer",
        headers: ref ? { Referer: ref as string } : {},
      });

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", "inline");
      res.send(response.data);
    } catch (error) {
      console.log(`[ERROR] ${error}`);
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          message: error.message,
          response: error.response?.data,
          headers: error.config?.headers ?? {},
        });
      }
      res.status(500).json({ error: "Failed to proxy content" });
    }
    return;
  }

  try {
    const headResponse = await axios.head(url, {
      headers: ref ? { Referer: ref as string } : {},
    });
    const contentType = headResponse.headers["content-type"];

    const responseType =
      contentType?.startsWith("image/") || contentType?.includes("arraybuffer")
        ? "arraybuffer"
        : contentType?.includes("json")
        ? "json"
        : "text";

    const response = await axios({
      method: "get",
      url,
      responseType: responseType,
      headers: ref ? { Referer: ref as string } : {},
    });

    // if text/plain or application/json, return as json
    if (responseType === "json") {
      res.json(response.data);
      return;
    }

    if (contentType.includes("application/vnd.apple.mpegurl")) {
      let m3u8Content = response.data.toString("utf-8");

      /// i forgor 😭
      const baseFetchUrl = `https://${req.get("host")}/fetch?url=`;
      const baseSegmentUrl = `https://${req.get("host")}/fetch/segment?url=`;

      m3u8Content = m3u8Content.replace(/([^\s]+\.m3u8)/g, (match: string) => {
        const absoluteUrl = new URL(match, url).href;
        let final = `${baseFetchUrl}${encodeURIComponent(absoluteUrl)}`;
        if (ref) {
          final = `${final}&ref=${encodeURIComponent(ref)}`;
        }
        return final;
      });

      // there will also be .jpg segments. so we replace those (animepahe specifically)
      m3u8Content = m3u8Content.replace(/([^\s]+\.jpg)/g, (match: string) => {
        const absoluteUrl = new URL(match, url).href;
        let final = `${baseSegmentUrl}${encodeURIComponent(absoluteUrl)}`;
        if (ref) {
          final = `${final}&ref=${encodeURIComponent(ref)}`;
        }
        return final;
      });

      // there also will be .key files (mon.key)
      m3u8Content = m3u8Content.replace(/URI="([^"]+)"/g, (match) => {
        match = match.replaceAll(`URI="`, ``).replaceAll(`"`, ``);
        const absoluteUrl = new URL(match).href;
        let final = `${baseSegmentUrl}${encodeURIComponent(absoluteUrl)}`;
        if (ref) {
          final = `${final}&ref=${encodeURIComponent(ref)}`;
        }
        return `URI="${final}"`;
      });

      // finally, gogoanime m3u8 segments start from ep*, so we replace it with OUR_URL/ep*
      m3u8Content = m3u8Content
        .split("\n")
        .map((line) => {
          if (line.startsWith("ep")) {
            return `${baseSegmentUrl}${encodeURIComponent(
              url.split("/ep")[0]
            )}/${line}`;
          }
          return line;
        })
        .join("\n");

      // lastly animez m3u8 segments start from playlist*, so we replace it with OUR_URL/playlist*
      m3u8Content = m3u8Content
        .split("\n")
        .map((line) => {
          if (line.startsWith("playlist")) {
            return `${baseSegmentUrl}${encodeURIComponent(
              url.split("/playlist")[0]
            )}/${line}&ref=${encodeURIComponent(ref)}`;
          }
          return line;
        })
        .join("\n");

      // FINALLY anivibe m3u8 segments start from e{number}*, so we replace it with OUR_URL/e{number}*
      m3u8Content = m3u8Content
        .split("\n")
        .map((line) => {
          if (line.match(/^e\d+/)) {
            // add ref here itself
            let final = `${baseSegmentUrl}${encodeURIComponent(
              url.split("/e")[0]
            )}/${line}`;
            if (ref) {
              final = `${final}&ref=${encodeURIComponent(ref)}`;
            }
            return final;
          }
          return line;
        })
        .join("\n");

      // lastly, filter the m3u8Content to remove any lines that start with #EXT-X-KEY:METHOD
      // m3u8Content = m3u8Content
      //   .split("\n")
      //   .filter((line) => {
      //     return !line.startsWith("#EXT-X-KEY:METHOD");
      //   })
      //   .join("\n");

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Connection", "Keep-Alive");
      res.send(m3u8Content);
      return;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", "inline");

    // finally there is also a mon.key file which we need to proxy
    let final = response.data;
    final = final.replace(/([^\s]+\.key)/g, (match: string) => {
      const absoluteUrl = new URL(match, url).href;
      const baseFetchUrl = `https://${req.get("host")}/fetch?url=`;
      let final = `${baseFetchUrl}${encodeURIComponent(absoluteUrl)}`;
      if (ref) {
        final = `${final}&ref=${encodeURIComponent(ref)}`;
      }
      return final;
    });

    // remove line which starts with #EXT-X-KEY:METHOD
    // final = final
    //   .split("\n")
    //   .filter((line) => {
    //     return !line.startsWith("#EXT-X-KEY:METHOD");
    //   })
    //   .join("\n");

    // pass through the content
    res.send(final);
  } catch (error) {
    console.log(`[ERROR] ${error}`);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        message: error.message,
        response: error.response?.data,
        headers: error.config?.headers ?? {},
      });
    }
    res.status(500).json({ error: "Failed to proxy content" });
  }
});

router.get("/segment", async (req: Request, res: Response) => {
  const { url, ref } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "No URL provided" });
  }

  console.clear();
  console.log(`[INFO] Fetching segment: ${url}`);
  console.log(`[INFO] Referrer: ${ref}`);
  let response: any;
  try {
    let headers = ref ? { Referer: ref as string, Origin: ref as string } : {};
    response = await axios({
      method: "get",
      url,
      responseType: "arraybuffer",
      headers: {
        ...headers,
        Connection: "keep-alive",
      },
      httpsAgent: new https.Agent({ keepAlive: true }),
    });

    const contentType = url.includes("mon.key")
      ? response.headers["content-type"] || "video/MP2T"
      : "video/MP2T";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", response.headers["content-length"]);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Connection", "Keep-Alive");

    let final = response.data;

    res.send(final);
  } catch (error) {
    console.log(`[ERROR] ${error}`);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        message: error.message,
        response: error.response?.data,
        headers: error.config?.headers ?? {},
      });
    }
    res.status(500).json({ error: "Failed to proxy video segment" });
  }
});

router.get("/video/*", async (req, res) => {
  try {
    const encodedUrl = req.params[0]; // Extract the encoded URL from the route
    const videoUrl = decodeURIComponent(encodedUrl);

    if (!/^https?:\/\//i.test(videoUrl)) {
      return res.status(400).send("Invalid URL");
    }

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
      "Accept-Encoding": "identity;q=1, *;q=0",
      Accept: "*/*",
    };
    headers.Referer = "https://animeheaven.me";

    if (req.headers.range) {
      headers.Range = req.headers.range;
      headers.Origin = "https://animeheaven.me";
    }

    // Fetch video from the source
    const response = await axios.get(videoUrl, {
      headers,
      responseType: "stream",
      validateStatus: () => true, // Accept all HTTP statuses
      httpsAgent: new https.Agent({
        keepAlive: true,
        rejectUnauthorized: false,
      }),
    });

    if (response.status >= 400) {
      return res
        .status(response.status)
        .send(`Error fetching video: ${response.statusText}`);
    }

    // Set response headers
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Content-Type": response.headers["content-type"] || "video/mp4",
      "Accept-Ranges": response.headers["accept-ranges"] || "bytes",
    });

    if (req.headers.range && response.headers["content-range"]) {
      res.set("Content-Range", response.headers["content-range"]);
    }

    // If the source returned a 206 Partial Content, forward that status code
    res.status(response.status);
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send(`Error fetching video: ${error.message}`);
  }
});

router.get("/hianime", async (req: Request, res: Response) => {
  const { url, ref } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    const headResponse = await axios.head(url, {
      headers: ref ? { Referer: ref as string } : {},
    });
    const contentType = headResponse.headers["content-type"];

    const responseType =
      contentType?.startsWith("image/") || contentType?.includes("arraybuffer")
        ? "arraybuffer"
        : contentType?.includes("json")
        ? "json"
        : "text";

    const response = await axios({
      method: "get",
      url,
      responseType: responseType,
      headers: ref ? { Referer: ref as string } : {},
    });

    console.log(`[INFO] CONTENT TYPE: ${contentType}`);
    console.log(`[INFO] RESPONSE TYPE: ${responseType}`);

    // if text/plain or application/json, return as json
    if (responseType === "json") {
      res.json(response.data);
      return;
    }

    // if (contentType.includes("application/vnd.apple.mpegurl")) {
    let m3u8Content = response.data.toString("utf-8");

    /// i forgor 😭
    const baseFetchUrl = `https://${req.get("host")}/fetch/hianime?url=`;
    const baseSegmentUrl = `https://${req.get("host")}/fetch/segment?url=`;

    // hianime starts sub m3u8s with index- so we make it OUR_URL/their_url/(replace master.m3u8 with this: index-*)
    const hianimeURL = url.substring(0, url.lastIndexOf("/"));
    m3u8Content = m3u8Content
      .split("\n")
      .map((line) => {
        if (line.startsWith("index-")) {
          let newURL = `${hianimeURL}/${line}`;
          newURL = `${baseFetchUrl}${encodeURIComponent(newURL)}`;
          if (ref) {
            newURL += `&ref=${encodeURIComponent(ref)}`;
          }
          return newURL;
        }
        return line;
      })
      .join("\n");

    // we also need to replace the iframe urls
    m3u8Content = m3u8Content
      .split("\n")
      .map((line) => {
        if (line.startsWith("#EXT-X-I-FRAME-STREAM-INF:")) {
          // match the URI="iframes-f1-v1-a1.m3u8" part
          const match = line.match(/URI="([^"]+)"/);
          if (match) {
            const iframeUrl = match[1];
            const newURL = `${hianimeURL}/${iframeUrl}`;
            const newLine = line.replace(
              /URI="[^"]+"/,
              `URI="${baseFetchUrl}${encodeURIComponent(
                newURL
              )}&ref=${encodeURIComponent(ref)}"`
            );
            return newLine;
          }
        }
        return line;
      })
      .join("\n");

    // now proxy all segments (jpg, html, png, webp, css, js, etc)
    m3u8Content = m3u8Content
      .split("\n")
      .map((line) => {
        if (line.startsWith("https://") && line.includes("seg-")) {
          let newURL = `${baseSegmentUrl}${encodeURIComponent(line)}`;
          if (ref) {
            newURL += `&ref=${encodeURIComponent(ref)}`;
          }
          return newURL;
        }
        return line;
      })
      .join("\n");

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Connection", "Keep-Alive");
    res.send(m3u8Content);
    return;
    // }

    // res.setHeader("Content-Type", contentType);
    // res.setHeader("Content-Disposition", "inline");

    // let final = response.data;

    // pass through the content
    // res.send(final);
  } catch (error) {
    console.log(`[ERROR] ${error}`);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        message: error.message,
        response: error.response?.data,
        headers: error.config?.headers ?? {},
      });
    }
    res.status(500).json({ error: "Failed to proxy content" });
  }
});

export default router;
