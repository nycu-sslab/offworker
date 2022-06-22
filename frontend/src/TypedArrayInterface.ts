import { SharedArrayBufferInterface } from "./SharedArrayBufferInterface"

function handleGet(
    target: SharedArrayBufferInterface, prop: string | number | symbol, receiver: any) {
    target.acquireLockWithSync();
    return Reflect.get(target, prop, receiver);
}

function handleSet(
    target: SharedArrayBufferInterface, prop: string | number | symbol, receiver: any) {
    target.acquireLockWithSync();
    return Reflect.set(target, prop, receiver);
}

const handler = {
    'get': handleGet,
    'set': handleSet,
};

class NewInt8Array extends Int8Array {
    constructor(first?: any, offset?: number, length?: number) {
        // @ts-ignore TypeScript checking is wrong
        super(first, offset, length);

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
        // We only override the case where `buffer` is SharedArrayBuffer.
        if (first instanceof SharedArrayBuffer) {
            // @ts-ignore
            return new Proxy(this, handler);
        }
    }
}
class NewUint8Array extends Uint8Array {
    constructor(first?: any, offset?: number, length?: number) {
        // @ts-ignore
        super(first, offset, length);
        if (first instanceof SharedArrayBuffer) {
            // @ts-ignore
            return new Proxy(this, handler);
        }
    }
}
class NewUint8ClampedArray extends Uint8ClampedArray {
    constructor(first?: any, offset?: number, length?: number) {
        // @ts-ignore
        super(first, offset, length);
        if (first instanceof SharedArrayBuffer) {
            // @ts-ignore
            return new Proxy(this, handler);
        }
    }
}
class NewInt16Array extends Int16Array {
    constructor(first?: any, offset?: number, length?: number) {
        // @ts-ignore
        super(first, offset, length);
        if (first instanceof SharedArrayBuffer) {
            // @ts-ignore
            return new Proxy(this, handler);
        }
    }
}
class NewUint16Array extends Uint16Array {
    constructor(first?: any, offset?: number, length?: number) {
        // @ts-ignore
        super(first, offset, length);
        if (first instanceof SharedArrayBuffer) {
            // @ts-ignore
            return new Proxy(this, handler);
        }
    }
}
class NewInt32Array extends Int32Array {
    constructor(first?: any, offset?: number, length?: number) {
        // @ts-ignore
        super(first, offset, length);
        if (first instanceof SharedArrayBuffer) {
            // @ts-ignore
            return new Proxy(this, handler);
        }
    }
}
class NewUint32Array extends Uint32Array {
    constructor(first?: any, offset?: number, length?: number) {
        // @ts-ignore
        super(first, offset, length);
        if (first instanceof SharedArrayBuffer) {
            // @ts-ignore
            return new Proxy(this, handler);
        }
    }
}
class NewFloat32ArrFay extends Float32Array {
    constructor(first?: any, offset?: number, length?: number) {
        // @ts-ignore
        super(first, offset, length);
        if (first instanceof SharedArrayBuffer) {
            // @ts-ignore
            return new Proxy(this, handler);
        }
    }
}
class NewFloat64Array extends Float64Array {
    constructor(first?: any, offset?: number, length?: number) {
        // @ts-ignore
        super(first, offset, length);
        if (first instanceof SharedArrayBuffer) {
            // @ts-ignore
            return new Proxy(this, handler);
        }
    }
}
class NewBigInt64Array extends BigInt64Array {
    constructor(first?: any, offset?: number, length?: number) {
        // @ts-ignore
        super(first, offset, length);
        if (first instanceof SharedArrayBuffer) {
            // @ts-ignore
            return new Proxy(this, handler);
        }
    }
}
class NewBigUint64Array extends BigUint64Array {
    constructor(first?: any, offset?: number, length?: number) {
        // @ts-ignore
        super(first, offset, length);
        if (first instanceof SharedArrayBuffer) {
            // @ts-ignore
            return new Proxy(this, handler);
        }
    }
}

const TypedArrayInterface = {
    NewInt8Array,
    NewUint8Array,
    NewUint8ClampedArray,
    NewInt16Array,
    NewUint16Array,
    NewInt32Array,
    NewUint32Array,
    NewFloat32ArrFay,
    NewFloat64Array,
    NewBigInt64Array,
    NewBigUint64Array
}

export default TypedArrayInterface;