import Emitter from "component-emitter"
import {CRCLCommandStatus, CRCLCommand} from "../module.mjs";
import {DONE, QUEUED, WORKING} from "../src/CRCLCommandStatus.mjs";

export const DEFAULT_QUEUEING_TIME = 50
export const DEFAULT_WORKING_TIME = 500

export default class MockReorderedRobotConnection extends Emitter {

    constructor(name, queueingTime = DEFAULT_QUEUEING_TIME, workingTime = DEFAULT_WORKING_TIME, tracktime = false) {
        super()
        this.name = name
        this.queue = []
        this.connected = false
        this.queueingTime = queueingTime
        this.workingTime = workingTime
        if (tracktime) this.times = {}
    }

    log(message){
        console.log(`${this.name}: ${message}`)
    }

    async connect() {
        this.connected = true
        setTimeout(() => this.serve(), 1);
        return this;
    }

    emit(name, line){
        if (name !== this.name) throw new Error('Wrong robot name provided')
        this.log(`Received: ${line}`)
        const cmd = CRCLCommand.fromJSON(line)
        if (this.times) this.times[cmd.cid] = {received: new Date()}
        setTimeout(() => {
            this.queue.push(cmd)
            if (this.times) this.times[cmd.cid].queued = new Date()
            this.log(`Sending Queued (${cmd.cid})`);
            super.emit(this.name, new CRCLCommandStatus(QUEUED, cmd.cid, 0).toJSON())
        }, this.queueingTime)
    }

    serve(){
        let sleep = 0
        if (this.inOperation){
            this.log(`Sending Done (${this.inOperation.cid})`);
            if (this.times) this.times[this.inOperation.cid].done = new Date()
            super.emit(this.name, new CRCLCommandStatus(WORKING, this.inOperation.cid, 1).toJSON())
            this.inOperation = undefined
        } else if (this.queue && this.queue.length > 0){
            this.inOperation = this.queue.shift()
            this.log(`Sending Working (${this.inOperation.cid})`);
            if (this.times) this.times[this.inOperation.cid].working = new Date()
            super.emit(this.name, new CRCLCommandStatus(DONE, this.inOperation.cid, 2).toJSON())
            sleep = this.workingTime
        }
        if (this.connected){
            setTimeout(() => this.serve(), sleep);
        }
    }

    async disconnect(){
        this.log("Disconnecting");
        this.connected = false
        this.log("Disconnected");
    }

}
