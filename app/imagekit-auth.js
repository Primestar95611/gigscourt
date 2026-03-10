import ImageKit from 'imagekit';

export default function handler(req, res) {
  const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
  });

  const authParams = imagekit.getAuthenticationParameters();
  res.status(200).json(authParams);
}
```

Step 3: Create package.json in your root folder

Create this file in your root directory:

```json
{
  "name": "gigscourt",
  "version": "1.0.0",
  "dependencies": {
    "imagekit": "^5.0.0"
  }
}
