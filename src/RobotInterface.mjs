import CRCLCommandStatus from "./CRCLCommandStatus.mjs";

const QUEUED = 'CRCL_Queued'
const WORKING = 'CRCL_Working'
const DONE = 'CRCL_Done'
const COMMAND_STATES = [QUEUED, WORKING, DONE]

export default class RobotInterface {

    constructor() {
        this.callbacks = new Map()
    }

    send(cmd){

    }

    sendNow(cmd, promiseStates = COMMAND_STATES){
        const c = {error:[]}
        const result = promiseStates.map(state => {
            return new Promise((resolve, error) => {
                c[state] = resolve
                c.error.push(error)
            });
        })
        this.callbacks.set(cmd.cid, c)
        this.send(cmd)
        return result
    }

    async receive(lines){
        for (const line of lines) {
            const status = CRCLCommandStatus.fromJSON(line)
            const statusCallbacks = this.callbacks.get(status.cid)
            if (status.state !== QUEUED && status.state !== WORKING){
                this.callbacks.delete(status.cid)
            }
            if (statusCallbacks[status.state]) {
                statusCallbacks[status.state]()
            } else {
                statusCallbacks.error.forEach(fn => fn(status))
            }
        }
    }
}