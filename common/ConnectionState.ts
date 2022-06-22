const enum ConnectionState {
    AcquireLockWithSync = "acquire_lock_with_sync",
    BufferReady = "buffer_ready",
    ConnectionReady = "connection_ready",
    CreateBuffer = "create_buffer",
    CreateWasmModule = "create_wasm_module",
    CreateLockThread = "create_lock_thread",
    CreateWasmMemory = "create_wasm_memory",
    CreateWorker = "create_worker",
    DownloadScript = "download_script",
    GetLockWithSync = "get_lock_with_sync",
    Message = "message",
    WasmModuleReady = "wasm_module_ready",
    WasmMemoryReady = "wasm_memory_ready",
    WorkerReady = "worker_ready",
    PostMessage = "post_message",
}

export { ConnectionState };