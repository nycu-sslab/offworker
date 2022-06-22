import { OffWorker, Env } from '../src/OffWorker';

class TestOffWorker extends OffWorker {
    postMsgData() {
        return this._postMsgData;
    }

    env(): Env {
        return this._env;
    }
}

export { TestOffWorker }