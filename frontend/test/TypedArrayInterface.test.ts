import { assert } from 'chai';
import TypedArrayInterface from '../src/TypedArrayInterface';

describe('TypedArrayInterface Test', () => {
    it('basic constructor', () => {
        for (const key in TypedArrayInterface) {
            // @ts-ignore
            const TypedArray = TypedArrayInterface[key];
            
            const arr0 = new TypedArray();
            const arr1 = new TypedArray(64);

            const buf = new ArrayBuffer(64);
            const arr2 = new TypedArray(buf);

            const buf2 = new SharedArrayBuffer(64);
            const arr3 = new TypedArray(buf2);
        }
    });
});