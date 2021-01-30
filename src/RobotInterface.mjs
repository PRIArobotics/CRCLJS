import CRCLCommandStatus, {COMMAND_STATES, COMMAND_STATES_IDs, DONE, QUEUED, WORKING} from "./CRCLCommandStatus.mjs";

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
        if (!this.connected){
            throw new Error("Socket disconnected")
        }
        this.log(`Sending: ${cmd.toJSON()}`)
        const c = {resolve: {}, reject:[], cmd: cmd, lastStateID: -1}
        this.sent.set(cmd.cid, c)
        const result = promiseStates.map(state => {
            return new Promise((resolve, reject) => {
                c.resolve[state] = resolve
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
            console.log("WARNING: Invalid/Finished status id: "+status.cid)
            return
        }
        const cmd = sentEntry.cmd
        if (status.state !== QUEUED && status.state !== WORKING){
            this.sent.delete(status.cid)
        }
        if (COMMAND_STATES.includes(status.state)){
            const stateID = COMMAND_STATES_IDs[status.state]
            if (stateID !== sentEntry.lastStateID+1){
                console.log(`WARNING: Invalid Status Order for command ${status.cid}: Received ${status.state} but should be ${COMMAND_STATES[sentEntry.lastStateID+1]}`)
                for (let i = sentEntry.lastStateID+1; i<stateID; i++){
                    const callback = sentEntry.resolve[COMMAND_STATES[i]]
                    const callBackStatus = new CRCLCommandStatus(COMMAND_STATES[i], status.cid, i)
                    if (callback) callback({cmd, status:callBackStatus})
                }
            }
            sentEntry.lastStateID = stateID
            const callback = sentEntry.resolve[status.state]
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