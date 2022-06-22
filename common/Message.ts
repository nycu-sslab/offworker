import { ConnectionState } from './ConnectionState';

interface Message {
    state: ConnectionState,
    data: any,
    code: any
}

function messageEncode(state: ConnectionState, data: any, code: any): string {
    return JSON.stringify({
        state,
        data,
        code
    });
}

function messageDecode(message: string): Message {
    const json = JSON.parse(message)
    return json;
}

export { Message, messageEncode, messageDecode };