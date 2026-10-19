/** Bounded upload workers; every temporary file is removed on success/failure. */
export async function uploadMediaFiles(files, uploadFile, removeFile, concurrency = 2) {
  const results = new Array(files.length);
  const failures = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, async () => {
    while (cursor < files.length) {
      const index = cursor++;
      const file = files[index];
      try { results[index] = await uploadFile(file); }
      catch (error) { failures.push(error); }
      finally { await removeFile(file).catch(() => {}); }
    }
  }));
  if (failures.length) throw failures[0];
  return results;
}
