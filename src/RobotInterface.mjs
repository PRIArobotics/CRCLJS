import CRCLCommandStatus, {COMMAND_STATES, DONE, QUEUED, WORKING} from "./CRCLCommandStatus.mjs";

export default class RobotInterface {

    constructor(robotConnection) {
        this.robotConnection = robotConnection;
        this.sent = new Map()
        this.robotConnection.on(this.name, (line) => this.receive(line))
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
        if (promiseStates.some(s => !COMMAND_STATES.includes(s))){
            throw new Error("Invalid promiseStates: "+promiseStates)
        }
        if (!this.connected) this.connect()
        this.log(`Sending: ${cmd.toJSON()}`)
        const c = {reject:[], cmd: cmd}
        this.sent.set(cmd.cid, c)
        const result = promiseStates.map(state => {
            return new Promise((resolve, reject) => {
                c[state] = resolve
                c.reject.push(reject)
            });
        })
        this.robotConnection.emit(this.name, cmd.toJSON())
        return result
    }

    async receive(line){
        const status = CRCLCommandStatus.fromJSON(line)
        this.log(`Received: ${status.toJSON()}`)
        const sentEntry = this.sent.get(status.cid)
        if (sentEntry === undefined){
            console.log("Error")
        }
        const cmd = sentEntry.cmd
        if (status.state !== QUEUED && status.state !== WORKING){
            this.sent.delete(status.cid)
        }
        if (COMMAND_STATES.includes(status.state)){
            const callback = sentEntry[status.state]
            if (callback) callback({cmd, status})
        } else {
            sentEntry.reject.forEach(reject => reject({cmd, status}))
        }
    }

    async schedule(cmds){
        for (let i = 0; i < cmds.length; i++){
            const cmd = cmds[i]
            if (i < cmds.length-1){
                console.time('Queueing')
                await this.send(cmd, [QUEUED])[0]
                console.timeEnd('Queueing')
            } else {
                await this.send(cmd, [DONE])[0]
            }
        }
    }
}