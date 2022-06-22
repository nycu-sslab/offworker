import { assert } from 'chai';
import { initSnapshot, analyzeScript } from '../src/functions';

describe('Functions Test', () => {

    it('Test initSnapshot', () => {
        initSnapshot();
    });


    it('Test analyzeScript 1', () => {
        const output = analyzeScript(`worker[i].onmessage = function() {};`);
        assert.isTrue(output.includes("new __ivm__.Reference(worker[i].onmessage)"));
        assert.isTrue(output.includes("worker[i]._id"));
    });

    it('Test analyzeScript 2', () => {
        const output = analyzeScript(`w.onmessage = function() {
            // ...
        };`);
        assert.isTrue(output.includes("new __ivm__.Reference(w.onmessage)"));
        assert.isTrue(output.includes("w._id"));
    });
});