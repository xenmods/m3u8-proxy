import { Router, type Request, type Response } from "express";
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
          if (line.match(/e\d+/)) {
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

  try {
    let headers = ref ? { Referer: ref as string } : {};
    const response = await axios({
      method: "get",
      url,
      responseType: "arraybuffer",
      headers: {
        ...headers,
        Connection: "keep-alive",
      },
      httpsAgent: new https.Agent({ keepAlive: true }),
    });

    const contentType = response.headers["content-type"] || "video/MP2T";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Connection", "Keep-Alive");

    // finally there is also a mon.key file which we need to proxy
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

export default router;
