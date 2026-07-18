export default async function handler(req, res) {
  let hostname = req.query.host || req.query.hostname;

  if (!hostname) {
    return res.status(400).send('缺少 host 参数');
  }

  hostname = hostname.trim().toLowerCase();

  try {
    const tls = await import('tls');

    const options = {
      host: hostname,
      port: 443,
      servername: hostname,
      rejectUnauthorized: false,
      timeout: 10000
    };

    const result = await new Promise((resolve, reject) => {
      const socket = tls.connect(options, () => {
        const cert = socket.getPeerCertificate();
        if (cert?.fingerprint256) {
          const sha1 = cert.fingerprint.replace(/:/g, '');
          const sha256 = cert.fingerprint256.replace(/:/g, '');
          socket.end();
          resolve({ sha1, sha256 });
        } else {
          socket.end();
          reject(new Error('无法获取证书'));
        }
      });

      socket.setTimeout(10000, () => {
        socket.destroy();
        reject(new Error('连接超时'));
      });

      socket.on('error', (err) => reject(err));
    });

    // 纯文本返回：两行
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(`${result.sha256}`);

  } catch (error) {
    res.status(500).send(`错误: ${error.message}`);
  }
}
