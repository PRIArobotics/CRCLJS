import CRCLCommandStatus from "./CRCLCommandStatus.mjs";

export default class BufferedRobotInterface {

    constructor(robotConnection, maxQueued = 5, maxSent = 1) {
        this.robotConnection = robotConnection
        this.queue = [] // list of commands to send in the future
        this.sent = new Map() // all sent commands with their newest status
        this.sentTime = new Map()
        this.maxQueued = maxQueued // maximum number of entries in the sent queue
        this.maxSent = maxSent
        this.sending = false; // currently sending?
        this.callbacks = new Map()
        this.robotConnection.on(robotConnection.name, (line) => this.onData(line))
    }

    schedule(cmds){
        return new Promise((resolve, error) => {
            this.queue.push(...cmds)
            this.addCallback(resolve, error, cmds[cmds.length-1].cid)
            this.sendNext()
        });
    }

    addCallback(resolve, error, cid){
        this.callbacks.set(cid, {resolve: resolve, error:error})
    }

    async sendNext(){
        if (!this.connected) this.connect()
        if (this.sending) return // skip if currently sending
        this.sending = true

        const sentList = [...this.sent.values()]
        const currentlySent = sentList.filter(status => status.state === 'CRCL_Sent').length
        const currentlyQueued = sentList.filter(status => status.state === 'CRCL_Queued').length

        if (currentlySent < this.maxSent && currentlyQueued < this.maxQueued && this.queue.length > 0){
            const c = this.queue.shift()
            console.log(`Sending: ${c.cmd} (${c.cid})`);
            this.sent.set(c.cid, new CRCLCommandStatus('CRCL_Sent', c.cid, -1))
            this.sentTime.set(c.cid, new Date())
            this.robotConnection.emit(this.robotConnection.name, c.toJSON());
        }
        this.sending = false
    }

    async onData(line){
        const status = CRCLCommandStatus.fromJSON(line)
        let time = ''
        if (this.sentTime.has(status.cid) && status.state === 'CRCL_Queued'){
            time = new Date().getTime() - this.sentTime.get(status.cid).getTime()+'ms'
        }
        console.log(`Received: ${status.toString()} ${time ? time : ''}`)
        if (status.state === 'CRCL_Queued' || status.state === 'CRCL_Working' ) {
            // update status if newer
            const oldstatus = this.sent.get(status.cid)
            if (oldstatus.sid < status.sid) this.sent.set(status.cid, status)

        } else if (status.state === 'CRCL_Done') {
            // remove from currently sent
            this.sent.delete(status.cid)
            this.sentTime.delete(status.cid)

            const callback = this.callbacks.get(status.cid)
            this.callbacks.delete(status.cid)
            if (callback) callback.resolve()
        } else {
            const error = 'Received invalid message:' + status.toString()
            console.log(error)
            for (c of this.callbacks.values()) c.error(error)
            await this.robotConnection.disconnect()
        }
        await this.sendNext()
    }

    get name(){
        return this.robotConnection.name
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
}