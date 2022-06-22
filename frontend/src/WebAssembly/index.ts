import { instantiateStreaming } from "./function";
import { WasmMemoryInterface} from "./MemoryInterface";

const NewWebAssembly = {
    instantiateStreaming: instantiateStreaming,
    Memory: WasmMemoryInterface,
};

export { NewWebAssembly };