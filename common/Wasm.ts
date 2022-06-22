interface WasmMemoryDescriptor {
    initial: number;
    maximum?: number;
    shared?: boolean;
}

export { WasmMemoryDescriptor }