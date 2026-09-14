import { createHmac, randomUUID } from "crypto";

function getImageKitConfig() {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error("ImageKit environment variables are incomplete.");
  }
  return { publicKey, privateKey, urlEndpoint };
}

function imageKitAuthorization(privateKey: string) {
  return `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
}

export function createImageKitUploadCredentials(entryId: string) {
  const { publicKey, privateKey, urlEndpoint } = getImageKitConfig();
  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 5 * 60;
  const signature = createHmac("sha1", privateKey)
    .update(`${token}${expire}`)
    .digest("hex");

  return {
    token,
    expire,
    signature,
    publicKey,
    urlEndpoint,
    folder: `/shubhojeets-videos/${entryId}`,
  };
}

export function createSignedImageKitUrl(
  filePath: string,
  expiresInSeconds = 60 * 60
) {
  const { privateKey, urlEndpoint } = getImageKitConfig();
  const endpoint = urlEndpoint.replace(/\/$/, "");
  const path = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const safePath = encodeURI(path);
  const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signature = createHmac("sha1", privateKey)
    .update(`${safePath}${expiry}`)
    .digest("hex");

  return `${endpoint}/${safePath}?ik-t=${expiry}&ik-s=${signature}`;
}

export async function removeImageKitAsset(fileId: string) {
  const { privateKey } = getImageKitConfig();
  const response = await fetch(
    `https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: { Authorization: imageKitAuthorization(privateKey) },
    }
  );
  if (!response.ok && response.status !== 404) {
    throw new Error("ImageKit could not delete the reference image.");
  }
}
