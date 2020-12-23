import _ from 'lodash'

export default class MultiRobotInterface{

    constructor() {
        this.robots = new Map()
        this.robotNames = new Map()
        this.queue = []
        this.groupedQueue = []
    }

    async addRobot(robot){
        this.robots.set(robot.name, robot)
        this.robotNames.set(robot, robot.name)
    }

    getRobotsList(){
        return [...this.robots.values()]
    }

    allConnected(){
        return this.getRobotsList().every(r => r)
    }

    async connectAll(){
        await Promise.all(this.getRobotsList().map(r => r.connect()))
    }

    async disconnectAll(){
        await Promise.all(this.getRobotsList().map(r => r.disconnect()))
    }

    addToQueue(robot, ...command){
        if (!_.isString(robot)) robot = this.robotNames.get(robot)
        command = command.filter(cmd => !_.isUndefined(cmd))
        if (!this.robots.has(robot)) throw new Error(robot + ' not added')
        this.queue.push(...command.map(cmd => {return {robot: robot, cmd: cmd}}))
    }

    renumberQueue(){
        this.queue.forEach((e, i) => {
            e.cmd = _.clone(e.cmd)
            e.cmd.cid = i
        })
    }

    async groupQueue(){
        const group = d => d.reduce((r,c,i,a) =>
            (a[i].robot == (a[i-1] && a[i-1].robot)
                ? r[r.length-1].push(c)
                : r.push([c]), r), [])
        this.groupedQueue = group(this.queue)
        this.groupedQueue = this.groupedQueue.map(l => {return {robot: l[0].robot, cmds: l.map(e => e.cmd)}})
    }

    async printQueue(){
        console.log("GROUPED PLAN")
        for (const group of this.groupedQueue){
            console.log()
            console.log(group.robot + ' Subqueue')
            console.log()
            group.cmds.forEach(cmd => console.log("  "+cmd))
        }
        console.log("")
    }

    async sendQueues(){
        if (this.robots.allConnected){
            new Error('A robot is not properly connected')
        }
        console.log("PLAN EXECUTION")
        for (const group of this.groupedQueue){
            console.log()
            console.log(group.robot + ' Subqueue')
            group.cmds.forEach(cmd => console.log("  "+cmd))
            console.log()
            await this.robots.get(group.robot).schedule(group.cmds)
        }
    }
}

