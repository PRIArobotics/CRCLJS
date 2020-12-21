export class CRCLCommandStatus {

    static fromJSON(json) {
        const cmd = JSON.parse(json)
        return new CRCLCommandStatus(cmd.CommandState, cmd.CommandID, cmd.StatusID, cmd.StateDescription)
    }

    constructor(state, cid, sid, sdescription) {
        this.state = state;
        this.cid = cid;
        this.sid = sid;
        this.sdescription = sdescription;
    }

    toJSON(pretty = false){
        return JSON.stringify({
            CommandState: this.state,
            CommandID: this.cid,
            StatusID: this.sid,
            StateDescription: this.sdescription,
        }, null, pretty ? 2 : 0)
    }

    toString(){
        return `${this.state}: ${this.cid} (${this.sid})${this.sdescription ? ' '+JSON.stringify(this.sdescription) : ''}`
    }
}

export default CRCLCommandStatus;