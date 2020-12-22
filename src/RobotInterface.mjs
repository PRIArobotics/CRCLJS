import CRCLCommandStatus from "./CRCLCommandStatus.mjs";

const QUEUED = 'CRCL_Queued'
const WORKING = 'CRCL_Working'
const DONE = 'CRCL_Done'
const COMMAND_STATES = [QUEUED, WORKING, DONE]

export default class RobotInterface {

    constructor(robotConnection) {
        this.robotConnection = robotConnection;
        this.callbacks = new Map()
        this.robotConnection.on(this.name, (lines) => this.receive(lines))
    }

    connect(){
        return this.robotConnection.connect()
    }

    disconnect(){
        return this.robotConnection.disconnect()
    }

    get connected(){
        return this.robotConnection.connected
    }

    log(message){
        console.log(`${this.name}: ${message}`)
    }

    get name() {
        return this.robotConnection.name
    }

    send(cmd, promiseStates = COMMAND_STATES){
        if (!this.connected) this.connect()
        this.log(`Sending: ${cmd}`)
        const c = {error:[]}
        const result = promiseStates.map(state => {
            return new Promise((resolve, error) => {
                c[state] = resolve
                c.error.push(error)
            });
        })
        this.callbacks.set(cmd.cid, c)
        this.robotConnection.emit(this.name, cmd.toJSON())
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