# Vendored sources

The third-party files in this directory, the version each is pinned at, and where it came from.
`tests/integration/test_openapi_docs.py` fails if `scalar.js` is missing from the table, its sha256
differs, or its package, version, URL, licence or retrieval date is empty.

`scalar.js` is the self-contained browser build (`package/dist/browser/standalone.js` in the npm
tarball below): it imports nothing, so the page works with no network but this origin. It is copied
byte for byte from llm-pdf-chatbot's vendored `backend/app/static/scalar.js` at the same pinned
version, and the sha256 below ties this copy to that repo's record. That record verifies the
tarball's sha512 against npm's published `dist.integrity`
(`sha512-d2M/gvqTkvrm7YAxcCxqM1xUvB58Ec1yhfw3uPeioHeaK+6j81MU9Z3nmFkIU6O5kMZMprG3dR9VdmxOG8potA==`,
shasum `00bb84248959bbda9b54fd522903e362e56042f7`).

| File | Package | Version | URL | Licence | Retrieved | sha256 |
|---|---|---|---|---|---|---|
| scalar.js | @scalar/api-reference | 1.78.1 | https://registry.npmjs.org/@scalar/api-reference/-/api-reference-1.78.1.tgz | MIT | 2026-11-12 | db9d00b7ee9259ef90554cbf8b6b0f671c9e0fe8540a33d845630fee68cbb966 |

## Notes

- **scalar.js**: Scalar's standalone API reference, MIT. The licence is the package's own
  (`package.json` `"license": "MIT"`, and the README's Licence section); the tarball ships no
  LICENSE file, so the text below is the upstream one it points at,
  https://github.com/scalar/scalar/blob/main/LICENSE. The bundle also carries the licence comments
  of the code inside it (for example `/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */`).
- The bundle ends with `//# sourceMappingURL=standalone.js.map`. That map is 20 MB and is not
  vendored, so a browser with DevTools open asks for `docs/scalar.js.map` and gets a 404 from this
  origin. It is not an outside request and the page does not need it. The file is left byte for byte
  as published rather than edited to drop that line.
- To upgrade: `npm pack @scalar/api-reference@<version>`, copy `package/dist/browser/standalone.js`
  over `scalar.js`, then update the version, URL, retrieval date and sha256 above (and the pinned
  version the test asserts). Re-read the new version's defaults for anything that fetches from
  outside and turn it off in `docs.html` (`withDefaultFonts`, `proxyUrl` and `telemetry` at 1.78.1).

## Licence of scalar.js

```
MIT License

Copyright (c) 2023-present Scalar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
