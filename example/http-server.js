const http = require('http')
const fs = require('fs')
const path = require('path');

function getUpperPath(path) {
    let idx = -1;
    const lastPos = path[path.length - 1] == '/' ? path.length - 1 : path.length;
    for (let i = 0; i < lastPos; i++) {
        if (path[i] == '/')
            idx = i;
    }
    if (idx == -1) return "";
    return path.slice(0, idx);
}

const server = http.createServer((req, res) => {

    try {
        const url = req.url.split("?")[0];
        const filePath = path.join('.', url);

        const date = new Date();
        console.log(date.toISOString(), filePath);

        if (filePath == "favicon.ico") {
            return;
        } else if (filePath.includes(".map")) {
            return;
        }

        if (fs.lstatSync(filePath).isDirectory()) {
            const files = fs.readdirSync(filePath);
            let response = `<div style="padding: 30px;"> Current path: ${filePath}</br>`;
            response += `<a href="/${getUpperPath(filePath)}">..</a></br>`;
            files.forEach(file => {
                response += `<a href="/${filePath}/${file}">${file}</a></br>`
            })
            response += "</div>"

            res.write(response);
            res.end();
            return;
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

        if (filePath.includes(".html")) {
            res.setHeader('Content-Type', 'text/html');
        } else if (filePath.includes(".js")) {
            res.setHeader('Content-Type', 'text/javascript');
        } else if (filePath.includes(".wasm")) {
            res.setHeader('Content-Type', 'application/wasm');
        }

        fs.readFile(filePath, 'utf-8', (err, data) => {
            res.setHeader('Content-Length', data.length);
            res.write(data)
            res.end();
        })
    } catch (e) {
        console.log(e);
    }
});

const port = 8081;
console.log(`Running server on port: ${port}`);
server.listen(port);