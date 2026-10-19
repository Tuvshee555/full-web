/**
 * Adds Cache-Control to public, read-only endpoints (menu, categories, reviews)
 * so browsers / CDNs can serve repeat requests without hitting the API+DB.
 *
 * Only use on data that is safe to be briefly stale and is NOT user-specific.
 *
 * @param {number} maxAge seconds a client may use the cached response
 * @param {number} swr    seconds it may keep serving stale while revalidating
 */
export const publicCache =
  (maxAge = 15, swr = 30) =>
  (req, res, next) => {
    const writeHead = res.writeHead;
    // Decide once the response status and any authentication cookies are
    // known. Setting public at request time also caches failures/private data.
    res.writeHead = function (statusCode, ...args) {
      if (((statusCode < 200 || statusCode >= 300) && statusCode !== 304) || req.user || this.getHeader("Set-Cookie")) {
        this.setHeader("Cache-Control", "private, no-store");
      } else if (!this.getHeader("Cache-Control")) {
        this.setHeader("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
      }
      return writeHead.call(this, statusCode, ...args);
    };
    next();
  };
