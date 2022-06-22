import ivm from 'isolated-vm';
import fs from 'fs';

function initSnapshot() {
    const code = fs.readFileSync(__dirname + "/IsolateInit.js").toString();
    // @ts-ignore js global
    global.snapshot = ivm.Isolate.createSnapshot([{ code }]);
}

function analyzeScript(script: string): string {
    let lines = script.split("\n");

    let stackCnt = 0;

    for (let i = 0; i < lines.length; i++) {
        let currentLine = lines[i];
        if (currentLine.includes(".onmessage")) {
            let identifier = "";

            identifier = currentLine.split('.')[0];

            let j = 0;
            do {
                const nextLine = lines[i + j];

                for (let ch of nextLine) {
                    if (ch == '{')
                        stackCnt += 1;
                    else if (ch == '}')
                        stackCnt -= 1;
                }
                j += 1;
            } while (stackCnt > 0);

            j -= 1;

            lines[i + j] += `
                __workerOnmessage__.apply(
                undefined, [__workerEmitter__, 
                    new __ivm__.Reference(${identifier}.onmessage),
                    ${identifier}._id]);
            `;

            i += j;
        }
    }

    let output = "";

    for (let line of lines) {
        output += line + '\n';
    }

    return output;
}

export {
    initSnapshot,
    analyzeScript
};
