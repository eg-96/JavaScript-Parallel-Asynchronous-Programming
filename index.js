async function pooledDownload(connect, save, downloadList, maxConcurrency) {
  let activeConnections = 0;
  let currentIndex = 0;
  const totalFiles = downloadList.length;
  const errors = [];

  async function downloadAndSave(url) {
    let connection;
    try {
      connection = await connect();
      const fileContents = await connection.download(url);
      await save(fileContents);
    } catch (error) {
      errors.push(error);
    } finally {
      if (connection) {
        connection.close();
      }
      activeConnections--;
      processNext();
    }
  }

  function processNext() {
    if (errors.length > 0) {
      return;
    }

    while (activeConnections < maxConcurrency && currentIndex < totalFiles) {
      activeConnections++;
      downloadAndSave(downloadList[currentIndex]);
      currentIndex++;
    }
  }

  processNext();

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (activeConnections === 0) {
        clearInterval(interval);
        if (errors.length > 0) {
          reject(errors);
        } else {
          resolve();
        }
      }
    }, 100);
  });
}

module.exports = pooledDownload