const logger = require("node-color-log");
logger.setLevelNoColor();

enum DecisionState {
    Offloaded = 1,
    Local = 0,
    Unknown = -1,
    Unready = -2,
}

const DecisionSetting = {
    batteryThreshold: 0.3,
}

const DecisionEarlyResult = {
    value: DecisionState.Unready
}

class DecisionEarlyMaker {
    public async run() {
        const frontendResult = await this.frontendDecision();
        if (frontendResult == DecisionState.Offloaded) {
            DecisionEarlyResult.value = DecisionState.Offloaded;
            return;
        }
        else if (frontendResult == DecisionState.Local) {
            DecisionEarlyResult.value = DecisionState.Local;
            return;
        }

        const backendResult = await this.backendDecision();
        if (backendResult == DecisionState.Offloaded) {
            DecisionEarlyResult.value = DecisionState.Offloaded;
            return;
        }

        DecisionEarlyResult.value = DecisionState.Local;
    }

    private async frontendDecision(): Promise<DecisionState> {
        //@ts-ignore web api
        const battery = await navigator.getBattery();

        if (battery.level < DecisionSetting.batteryThreshold) {
            logger.debug("[Decision] frontend offloaded: battery");
            return DecisionState.Offloaded;
        }

        logger.debug("[Decision] frontend unknown");
        return DecisionState.Unknown;
    }

    private async backendDecision(): Promise<DecisionState> {

        logger.debug("[Decision] backend offloaded");
        return DecisionState.Offloaded;
    }
}

class DecisionMaker {

    public async run(workerId: number): Promise<boolean> {
        if (this.checkGlobalSetting() == DecisionState.Offloaded)
            return true;

        const cookieResult = this.checkCookie(workerId);
        if (cookieResult == DecisionState.Offloaded)
            return true;
        else if (cookieResult == DecisionState.Local)
            return false;

        while (DecisionEarlyResult.value == DecisionState.Unready) {
            await wait();
        }

        if (DecisionEarlyResult.value == DecisionState.Offloaded) {
            return true;
        }

        return false;
    }

    private checkGlobalSetting(): DecisionState {
        // @ts-ignore global variable
        if (global.OFFWORKER.EnableAll) {
            logger.debug("[Decision] EnableAll");
            return DecisionState.Offloaded;
        }

        return DecisionState.Unknown;
    }

    private checkCookie(workerId: number): DecisionState {

        if (document.cookie == "") {
            logger.debug("[Decision] Cookie unknown");
            return DecisionState.Unknown;
        }

        let record;
        try {
            record = JSON.parse(document.cookie);
        } catch (e) {
            return DecisionState.Unknown;
        }

        if (record[workerId] == DecisionState.Offloaded) {
            logger.debug("[Decision] Cookie offloaded");
            return DecisionState.Offloaded;
        }

        logger.debug("[Decision] Cookie local");
        return DecisionState.Local;
    }


}

async function wait() {
    await new Promise(resolve => setTimeout(resolve, 10));
}

const DecisionEarlyMakerSingleton = new DecisionEarlyMaker();
const DecisionMakerSingleton = new DecisionMaker();

export { DecisionEarlyMakerSingleton, DecisionMakerSingleton }